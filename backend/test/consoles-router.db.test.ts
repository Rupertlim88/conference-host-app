import { amsTables, connect, createOrganiserStore, createStore, createSyncLog, loadRows, type Db } from "@repo/host-store";
import { migrateStore } from "@repo/host-store/migrate";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import type { ConferenceApi } from "../src/conference-api";
import { appRouter } from "../src/router";
import { createCallerFactory, type Context } from "../src/trpc";
import { rows as baseRows } from "./programme";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;
const at = (iso: string) => new Date(iso);

// S1 (J7, 350D, 19:45–21:00 UTC on 27 January, 13:45 in Chicago) holds T1 and T2; S2 (K1, Hall B, 28 January)
// holds T3, a 15-minute talk from 15:00 to 15:15 UTC. S3 is a virtual session on 20 January, five days before the
// meeting, with no end; S4 has no time.
const T3 = { ...baseRows.talks[0]!, id: "T3", sessionId: "S2", number: "K1.1", startsAt: at("2026-01-28T15:00:00Z"), endsAt: at("2026-01-28T15:15:00Z"), room: "Hall B" };
const rows = {
  ...baseRows,
  sessions: [
    ...baseRows.sessions,
    { ...baseRows.sessions[0]!, id: "S2", number: "K1", title: "Clouds", startsAt: at("2026-01-28T15:00:00Z"), endsAt: at("2026-01-28T16:30:00Z"), room: "Hall B" },
    { ...baseRows.sessions[0]!, id: "S3", number: "V1", title: "Virtual posters", startsAt: at("2026-01-20T19:00:00Z"), endsAt: null, room: "" },
    { ...baseRows.sessions[0]!, id: "S4", number: "X1", title: "Untimed", startsAt: null, endsAt: null, room: "" },
  ],
  talks: [
    ...baseRows.talks.map((t) => ({ ...t, endsAt: new Date(t.startsAt!.getTime() + 15 * 60_000) })),
    T3,
  ],
  talkPeople: [...baseRows.talkPeople, { talkId: "T3", personId: "ada-author" }],
};

const viewer = { id: "organiser-1", name: "Guest", email: "guest@example.com", image: null };
const writes: string[] = [];
const api: ConferenceApi = {
  related: async () => ({ status: "unavailable" }),
  writeTalks: async (req) => {
    writes.push(...req.talks.map((t) => t.id));
    return { programmeVersion: "pv_router", added: req.talks.length, changed: 0, withdrawn: 0, unchanged: 0, matchingJob: null };
  },
  check: async () => ({ outcome: { kind: "answered", httpStatus: 200, validBody: true }, ms: 12 }),
};
const settings = { apiAddress: "http://127.0.0.1:8787/", keySet: true };

describe.skipIf(!url)("organiser and developer procedures", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const ctx = (over: Partial<Context> = {}): Context => ({
    store: createStore(db, "ams"),
    organiser: createOrganiserStore(db, "ams"),
    log: createSyncLog(db, "ams"),
    api,
    settings,
    viewer,
    ...over,
  });
  const caller = (over: Partial<Context> = {}) => createCallerFactory(appRouter)(ctx(over));

  beforeEach(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, rows);
    await db.execute(sql`delete from ams2027.sync_runs`);
    writes.length = 0;
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("every console procedure needs a signed-in viewer", async () => {
    const anon = caller({ viewer: null });
    await expect(anon.organiser.talks.list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anon.organiser.programme.send()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anon.developer.reset()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("lists talks with search and status, and gets one", async () => {
    const c = caller();
    expect((await c.organiser.talks.list({})).total).toBe(3);
    expect((await c.organiser.talks.list({ q: "K1" })).talks.map((t) => t.id)).toEqual(["T3"]);
    expect(await c.organiser.talks.get({ id: "T3" })).toMatchObject({ sessionNumber: "K1", change: "none" });
    await expect(c.organiser.talks.get({ id: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(c.organiser.talks.list({ page: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("a moved talk takes the new session's room and goes after its last talk, keeping its length", async () => {
    const moved = await caller().organiser.talks.move({ id: "T1", sessionId: "S2" });
    expect(moved).toMatchObject({
      sessionId: "S2",
      sessionNumber: "K1",
      room: "Hall B",
      startsAt: "2026-01-28T15:15:00.000Z",
      endsAt: "2026-01-28T15:30:00.000Z",
      change: "moved",
    });
    await expect(caller().organiser.talks.move({ id: "T1", sessionId: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("a withdrawn talk has no related talks to show", async () => {
    const c = caller();
    await c.organiser.talks.withdraw({ id: "T2" });
    await expect(c.talks.related({ id: "T2" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await c.schedule.starred()).map((t) => t.targetId)).not.toContain("T2");
  });

  test("moving a talk into its own session changes nothing", async () => {
    const c = caller();
    const before = await c.organiser.talks.get({ id: "T1" });
    expect(await c.organiser.talks.move({ id: "T1", sessionId: "S1" })).toEqual(before);
  });

  test("withdraw and restore", async () => {
    const c = caller();
    expect(await c.organiser.talks.withdraw({ id: "T2" })).toMatchObject({ withdrawn: true });
    await expect(c.talks.get({ id: "T2" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await c.organiser.talks.restore({ id: "T2" })).toMatchObject({ withdrawn: false });
    expect((await c.talks.get({ id: "T2" })).id).toBe("T2");
    await expect(c.organiser.talks.withdraw({ id: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("a session change is read in the meeting's time zone and shifts its talks", async () => {
    const changed = await caller().organiser.sessions.change({ id: "S1", date: "2026-01-27", start: "14:45", end: "16:00", room: "Hall C" });
    expect(changed).toMatchObject({ startsAt: "2026-01-27T20:45:00.000Z", endsAt: "2026-01-27T22:00:00.000Z", room: "Hall C", changed: true });
    expect(changed.talks.map((t) => [t.id, t.startsAt, t.room])).toEqual([
      ["T1", "2026-01-27T20:45:00.000Z", "Hall C"],
      ["T2", "2026-01-27T21:00:00.000Z", "Hall C"],
    ]);
  });

  test("a session change with bad times is refused and changes nothing", async () => {
    const c = caller();
    await expect(c.organiser.sessions.change({ id: "S1", date: "2026-01-27", start: "16:00", end: "15:00", room: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "end-before-start",
    });
    await expect(c.organiser.sessions.change({ id: "S1", date: "2026-03-01", start: "09:00", end: "10:00", room: "" })).rejects.toMatchObject({
      message: "outside-meeting",
    });
    await expect(c.organiser.sessions.change({ id: "nope", date: "2026-01-27", start: "09:00", end: "10:00", room: "" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await c.organiser.sessions.get({ id: "S1" })).changed).toBe(false);
  });

  test("a session can keep its own published times however far they are from the meeting, and get a new room", async () => {
    const c = caller();
    expect(await c.organiser.sessions.change({ id: "S3", date: "2026-01-20", start: "13:00", end: "", room: "Online" })).toMatchObject({
      startsAt: "2026-01-20T19:00:00.000Z",
      endsAt: null,
      room: "Online",
    });
    expect(await c.organiser.sessions.change({ id: "S4", date: "", start: "", end: "", room: "Hall D" })).toMatchObject({
      startsAt: null,
      room: "Hall D",
    });
    await expect(c.organiser.sessions.change({ id: "S4", date: "2026-01-27", start: "", end: "", room: "" })).rejects.toMatchObject({
      message: "incomplete-time",
    });
  });

  test("lists sessions with their talk counts", async () => {
    const list = await caller().organiser.sessions.list({});
    expect(list.sessions.map((s) => [s.id, s.talks])).toEqual([["S3", 0], ["S1", 2], ["S2", 1], ["S4", 0]]);
    await expect(caller().organiser.sessions.get({ id: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("send writes the shown programme and returns the run; the last runs are listed", async () => {
    const c = caller();
    await c.organiser.talks.withdraw({ id: "T2" });
    expect(await c.organiser.programme.changes()).toEqual({ moved: 0, rescheduled: 0, withdrawn: 1, sessions: 0 });
    const run = await c.organiser.programme.send();
    expect(run).toMatchObject({ state: "sent", sent: 2, programmeVersion: "pv_router" });
    expect(writes.sort()).toEqual(["T1", "T3"]);
    expect(await c.organiser.programme.runs()).toEqual([run]);
  });

  test("send while another runs is a CONFLICT", async () => {
    await createSyncLog(db, "ams").start();
    await expect(caller().organiser.programme.send()).rejects.toMatchObject({ code: "CONFLICT" });
    expect(writes).toEqual([]);
  });

  test("a failed send returns the failed run rather than an error", async () => {
    const refusing: ConferenceApi = {
      ...api,
      writeTalks: async () => {
        const { ApiRefusedError } = await import("../src/conference-api");
        throw new ApiRefusedError(403, "Forbidden");
      },
    };
    expect(await caller({ api: refusing }).organiser.programme.send()).toMatchObject({ state: "failed", error: "403 Forbidden" });
  });

  test("developer status shows the address, the key, the last run and the changes", async () => {
    const c = caller();
    await c.organiser.talks.withdraw({ id: "T2" });
    const run = await c.organiser.programme.send();
    expect(await c.developer.status()).toEqual({
      apiAddress: "http://127.0.0.1:8787/",
      keySet: true,
      lastRun: run,
      changes: { moved: 0, rescheduled: 0, withdrawn: 1, sessions: 0 },
    });
  });

  test("test connection names the outcome and how long it took", async () => {
    expect(await caller().developer.testConnection()).toEqual({ status: "ok", httpStatus: 200, ms: 12 });
    const refused: ConferenceApi = { ...api, check: async () => ({ outcome: { kind: "answered", httpStatus: 401, validBody: false }, ms: 8 }) };
    expect(await caller({ api: refused }).developer.testConnection()).toEqual({ status: "refused-key", httpStatus: 401, ms: 8 });
    const notSet: ConferenceApi = { ...api, check: async () => ({ outcome: { kind: "not-set" }, ms: 0 }) };
    expect(await caller({ api: notSet }).developer.testConnection()).toEqual({ status: "not-set", httpStatus: null, ms: null });
  });

  test("reset puts the published programme back", async () => {
    const c = caller();
    await c.organiser.talks.move({ id: "T1", sessionId: "S2" });
    await c.organiser.talks.withdraw({ id: "T2" });
    expect(await c.developer.reset()).toEqual({ talks: 2, sessions: 0 });
    expect(await c.organiser.programme.changes()).toEqual({ moved: 0, rescheduled: 0, withdrawn: 0, sessions: 0 });
  });
});
