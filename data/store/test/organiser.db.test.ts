import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams-rows";
import { connect, type Db } from "../src/connect";
import { loadRows } from "../src/load";
import { migrateStore } from "../src/migrate";
import { createOrganiserStore, type Placement, type PlacementFacts } from "../src/organiser";
import { createStore } from "./store";
import { amsTables } from "../src/tables";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

// The AMS slice: session 73193 (J7, room 350D, 19:45–21:00 UTC) holds J7.1–J7.5; session 73941 (7, room 352D)
// holds one poster, 7.4A; one break has no session. 55 extra talks with no session make a second page.
const J71 = "464598";
const J72 = "470089";
const at = (iso: string) => new Date(iso);
const USER = "organiser-store-test";
/** A shift rule that ignores the old start: the fixed number of milliseconds, or none. */
const shiftBy = (ms: number | null) => () => ms;
/** Runs `work` after `ms`, so a second call can start while a first one is still inside its transaction. */
const later = <T,>(ms: number, work: () => T) => new Promise<T>((resolve) => setTimeout(() => resolve(work()), ms));

describe.skipIf(!url)("the organiser's store", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const organiser = createOrganiserStore(db, "ams");
  const attendee = createStore(db, "ams");
  const rows = amsRows(AmsFilesSchema.parse(fixture("ams-slice.json")));
  const loose = rows.talks.find((t) => t.id === J72)!;
  rows.talks.push(
    ...Array.from({ length: 55 }, (_, i) => ({
      ...loose,
      id: `extra-${i}`,
      sessionId: null,
      number: `X${String(i).padStart(2, "0")}`,
      title: `Extra talk ${i}`,
      presentingAuthor: "",
      authorLine: "",
    })),
  );

  beforeEach(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, rows);
    await db.execute(sql`delete from ams2027.stars where user_id = ${USER}`);
    await db.execute(sql`delete from ams2027.notes where user_id = ${USER}`);
  });
  afterAll(async () => {
    await conn?.close();
  });

  describe("talk list", () => {
    test("pages 50 at a time with no talk on two pages", async () => {
      const first = await organiser.talks({ q: "", status: "all", page: 1 });
      const second = await organiser.talks({ q: "", status: "all", page: 2 });
      expect(first.total).toBe(62);
      expect(first.talks).toHaveLength(50);
      expect(second.talks).toHaveLength(12);
      expect(new Set([...first.talks, ...second.talks].map((t) => t.id)).size).toBe(62);
    });
    test("finds talks by number, title or author, and filters by session", async () => {
      const byNumber = await organiser.talks({ q: "J7.", status: "all", page: 1 });
      expect(byNumber.talks.map((t) => t.number)).toEqual(["J7.1", "J7.2", "J7.3", "J7.4", "J7.5"]);
      expect((await organiser.talks({ q: "graff", status: "all", page: 1 })).talks.map((t) => t.id)).toEqual([J71]);
      const inSession = await organiser.talks({ q: "", status: "all", sessionId: "73941", page: 1 });
      expect(inSession.total).toBe(1);
      expect(inSession.talks.every((t) => t.sessionNumber === "7")).toBe(true);
    });
    test("a page past the end shows the last page", async () => {
      const last = await organiser.talks({ q: "", status: "all", page: 400 });
      expect(last.page).toBe(2);
      expect(last.talks).toHaveLength(12);
      expect((await organiser.sessions({ q: "", page: 99 })).page).toBe(1);
      expect((await organiser.talks({ q: "zzz", status: "all", page: 3 })).page).toBe(1);
    });
    test("treats % and _ in search text as plain characters", async () => {
      expect((await organiser.talks({ q: "%", status: "all", page: 1 })).total).toBe(0);
    });
  });

  test("a connection test asks about a shown talk that a send includes", async () => {
    const sendable = rows.talks.filter((t) => t.kind !== "break" && t.abstract.trim() !== "").map((t) => t.id).sort();
    expect(await organiser.sampleTalkId()).toBe(sendable[0]);
    await organiser.setWithdrawn(sendable[0]!, true);
    expect(await organiser.sampleTalkId()).toBe(sendable[1]);
  });

  describe("withdrawing", () => {
    test("takes a talk out for attendees, and restoring brings it back", async () => {
      expect(await organiser.setWithdrawn(J71, true)).toBe(true);
      expect(await attendee.talk(J71)).toBeNull();
      expect(await organiser.talk(J71)).toMatchObject({ id: J71, withdrawn: true, change: "none" });
      expect((await organiser.talks({ q: "", status: "withdrawn", page: 1 })).talks.map((t) => t.id)).toEqual([J71]);
      expect((await organiser.talks({ q: "", status: "scheduled", page: 1 })).total).toBe(61);
      expect(await organiser.setWithdrawn(J71, false)).toBe(true);
      expect(await attendee.talk(J71)).not.toBeNull();
    });
    test("an unknown talk is reported as not found", async () => {
      expect(await organiser.setWithdrawn("nope", true)).toBe(false);
    });
  });

  describe("moving", () => {
    /** The rule the backend passes in, kept simple: after the session's last shown talk, keeping the length. */
    const after = (f: PlacementFacts): Placement => {
      const start = f.tail.lastEnd ?? f.session.startsAt;
      const length = f.talk.startsAt && f.talk.endsAt ? f.talk.endsAt.getTime() - f.talk.startsAt.getTime() : 0;
      return { ...f.session, startsAt: start, endsAt: start && new Date(start.getTime() + length), sort: (f.tail.lastSort ?? 0) + 1 };
    };

    test("gives the placement rule the talk, the session and the session's last shown talk", async () => {
      await organiser.setWithdrawn("477914", true); // J7.5, the last talk of J7
      const seen: PlacementFacts[] = [];
      await organiser.moveTalk("463094", "73193", (f) => (seen.push(f), after(f)));
      expect(seen).toEqual([
        {
          talk: { kind: "poster", startsAt: at("2026-01-27T20:30:00Z"), endsAt: at("2026-01-27T20:45:00Z") },
          session: {
            startsAt: at("2026-01-27T19:45:00Z"),
            endsAt: at("2026-01-27T21:00:00Z"),
            room: "350D",
            building: "George R. Brown Convention Center",
          },
          tail: { lastEnd: at("2026-01-27T20:45:00Z"), lastSort: 3 },
        },
      ]);
      expect(await organiser.moveTalk(J71, "nope", after)).toBe(false);
      expect(await organiser.moveTalk("nope", "73193", after)).toBe(false);
    });

    test("writes the placement: the talk shows as moved, in its new session for attendees", async () => {
      const placement = { startsAt: at("2026-01-27T21:00:00Z"), endsAt: at("2026-01-27T21:15:00Z"), room: "352D", building: "B", sort: 9 };
      expect(await organiser.moveTalk(J71, "73941", () => placement)).toBe(true);
      expect(await organiser.talk(J71)).toMatchObject({ sessionId: "73941", sessionNumber: "7", room: "352D", change: "moved" });
      expect((await attendee.session("73941"))!.talks.map((t) => t.id)).toContain(J71);
      expect((await attendee.session("73193"))!.talks.map((t) => t.id)).not.toContain(J71);
      expect((await organiser.talks({ q: "", status: "changed", page: 1 })).talks.map((t) => t.id)).toEqual([J71]);
    });

    test("moving a talk into its own session changes nothing", async () => {
      const before = await organiser.talk(J71);
      expect(await organiser.moveTalk(J71, "73193", after)).toBe(true);
      expect(await organiser.talk(J71)).toEqual(before);
    });

    test("two talks moved into one session at once get consecutive places", async () => {
      // The first move holds its transaction open for 200 ms; the second starts at 50 ms, while it is still open.
      await Promise.all([
        organiser.moveTalk(J71, "73941", (f) => later(200, () => after(f))),
        later(50, () => organiser.moveTalk(J72, "73941", after)),
      ]);
      const [a, b] = [await organiser.talk(J71), await organiser.talk(J72)].sort((x, y) => x!.startsAt!.localeCompare(y!.startsAt!));
      expect(a!.endsAt).toBe(b!.startsAt);
    });
  });

  describe("changing a session", () => {
    test("moves its time and room, shifts every talk in it and moves their room", async () => {
      const found = await organiser.changeSession(
        "73193",
        { startsAt: at("2026-01-27T20:45:00Z"), endsAt: at("2026-01-27T22:00:00Z"), room: "Hall A" },
        shiftBy(60 * 60_000),
      );
      expect(found).toBe(true);
      const session = await organiser.session("73193");
      expect(session).toMatchObject({ startsAt: "2026-01-27T20:45:00.000Z", room: "Hall A", changed: true });
      expect(session!.talks.map((t) => [t.number, t.startsAt, t.room, t.change])).toEqual([
        ["J7.1", "2026-01-27T20:45:00.000Z", "Hall A", "rescheduled"],
        ["J7.2", "2026-01-27T21:00:00.000Z", "Hall A", "rescheduled"],
        ["J7.3", "2026-01-27T21:15:00.000Z", "Hall A", "rescheduled"],
        ["J7.4", "2026-01-27T21:30:00.000Z", "Hall A", "rescheduled"],
        ["J7.5", "2026-01-27T21:45:00.000Z", "Hall A", "rescheduled"],
      ]);
    });
    test("with no shift keeps the talks' times and still moves their room", async () => {
      await organiser.changeSession("73193", { startsAt: at("2026-01-27T19:45:00Z"), endsAt: at("2026-01-27T21:00:00Z"), room: "Hall B" }, shiftBy(null));
      const talks = (await organiser.session("73193"))!.talks;
      expect(talks[0]).toMatchObject({ startsAt: "2026-01-27T19:45:00.000Z", room: "Hall B" });
    });
    test("with no new start, leaves the session and its talks untimed or as they were, and still moves the room", async () => {
      await organiser.changeSession("73193", { startsAt: null, endsAt: null, room: "Hall C" }, shiftBy(null));
      const session = await organiser.session("73193");
      expect(session).toMatchObject({ startsAt: null, endsAt: null, room: "Hall C" });
      expect(session!.talks[0]).toMatchObject({ startsAt: "2026-01-27T19:45:00.000Z", room: "Hall C" });
    });
    test("the published programme's first and last days, in the meeting's zone", async () => {
      expect(await organiser.publishedDays("America/Chicago")).toEqual({ first: "2026-01-27", last: "2026-01-27" });
    });
    test("two saves of the same change at once move its talks once, by the shift from the start each one locked", async () => {
      const times = { startsAt: at("2026-01-27T20:45:00Z"), endsAt: at("2026-01-27T22:00:00Z"), room: "350D" };
      const shift = (old: Date | null) => times.startsAt.getTime() - old!.getTime();
      // The first save holds its transaction open for 200 ms; the second starts at 50 ms, while it is still open.
      await Promise.all([
        organiser.changeSession("73193", times, (old) => later(200, () => shift(old))),
        later(50, () => organiser.changeSession("73193", times, shift)),
      ]);
      expect((await organiser.session("73193"))!.talks[0]!.startsAt).toBe("2026-01-27T20:45:00.000Z");
    });

    test("a reset and a session save at the same moment both finish, and the talks stay with their session", async () => {
      const shift = (to: string) => (old: Date | null) => at(to).getTime() - old!.getTime();
      for (let round = 0; round < 15; round++) {
        await organiser.changeSession("73193", { startsAt: at("2026-01-27T20:45:00Z"), endsAt: at("2026-01-27T22:00:00Z"), room: "350D" }, shift("2026-01-27T20:45:00Z"));
        const results = await Promise.allSettled([
          organiser.resetToPublished(),
          organiser.changeSession("73193", { startsAt: at("2026-01-27T21:45:00Z"), endsAt: at("2026-01-27T23:00:00Z"), room: "350D" }, shift("2026-01-27T21:45:00Z")),
        ]);
        expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
        const session = (await organiser.session("73193"))!;
        expect(session.talks[0]!.startsAt).toBe(session.startsAt);
      }
    });

    test("an untimed session given a time gives its untimed talks the session's times", async () => {
      await organiser.changeSession("73193", { startsAt: null, endsAt: null, room: "" }, shiftBy(null));
      await organiser.moveTalk("463533", "73193", (f) => ({ ...f.session, sort: 9 })); // the break, which has no time
      await organiser.changeSession("73193", { startsAt: at("2026-01-27T16:00:00Z"), endsAt: at("2026-01-27T17:00:00Z"), room: "Online" }, shiftBy(null));
      expect(await organiser.talk("463533")).toMatchObject({ startsAt: "2026-01-27T16:00:00.000Z", endsAt: "2026-01-27T17:00:00.000Z" });
    });

    test("an unknown session is reported as not found", async () => {
      expect(await organiser.changeSession("nope", { startsAt: at("2026-01-27T19:45:00Z"), endsAt: null, room: "" }, shiftBy(null))).toBe(false);
    });
  });

  describe("the session list", () => {
    test("counts each session's shown talks and marks changed sessions", async () => {
      await organiser.setWithdrawn(J71, true);
      await organiser.changeSession("73941", { startsAt: at("2026-01-27T19:45:00Z"), endsAt: at("2026-01-27T21:00:00Z"), room: "Hall C" }, shiftBy(0));
      const list = await organiser.sessions({ q: "", page: 1 });
      expect(list.total).toBe(2);
      expect(list.sessions.map((s) => [s.id, s.talks, s.changed])).toEqual([
        ["73941", 1, true],
        ["73193", 4, false],
      ]);
      expect((await organiser.sessions({ q: "J7", page: 1 })).sessions.map((s) => s.id)).toEqual(["73193"]);
    });
    test("an organiser's session lists withdrawn talks too", async () => {
      await organiser.setWithdrawn(J71, true);
      const talks = (await organiser.session("73193"))!.talks;
      expect(talks.find((t) => t.id === J71)).toMatchObject({ withdrawn: true });
      expect(await organiser.session("nope")).toBeNull();
    });
  });

  describe("changes and reset", () => {
    async function editEverything() {
      await attendee.star(USER, { targetKind: "talk", targetId: J71 });
      await attendee.saveNote(USER, { targetKind: "talk", targetId: J71 }, "keep me");
      await organiser.setWithdrawn(J71, true);
      await organiser.moveTalk(J72, "73941", (f) => ({ ...f.session, sort: 7 }));
      await organiser.changeSession("73941", { startsAt: at("2026-01-27T20:45:00Z"), endsAt: at("2026-01-27T22:00:00Z"), room: "Hall D" }, (old) => at("2026-01-27T20:45:00Z").getTime() - old!.getTime());
    }

    test("counts differences from the published programme, a withdrawn talk only as withdrawn", async () => {
      expect(await organiser.changes()).toEqual({ moved: 0, rescheduled: 0, withdrawn: 0, sessions: 0 });
      await editEverything();
      // J7.2 moved; 73941's poster rescheduled by the shift; J7.1 withdrawn; one session changed.
      expect(await organiser.changes()).toEqual({ moved: 1, rescheduled: 1, withdrawn: 1, sessions: 1 });
    });

    test("puts the published programme back, keeps stars and notes, and a second reset changes nothing", async () => {
      const before = await attendee.session("73193");
      await editEverything();
      expect(await organiser.resetToPublished()).toEqual({ talks: 3, sessions: 1 });
      expect(await organiser.changes()).toEqual({ moved: 0, rescheduled: 0, withdrawn: 0, sessions: 0 });
      expect(await attendee.session("73193")).toEqual(before);
      expect((await attendee.schedule(USER)).talks.map((t) => t.id)).toEqual([J71]);
      expect((await attendee.notes(USER)).map((n) => n.body)).toEqual(["keep me"]);
      expect(await organiser.resetToPublished()).toEqual({ talks: 0, sessions: 0 });
    });
  });
});
