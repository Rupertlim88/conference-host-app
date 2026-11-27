import { migrateStore } from "@repo/host-store/migrate";
import { amsTables, connect, createDemoSettings, createOrganiserStore, createGuestData, createProgramme, createSyncLog, loadRows, type Db } from "@repo/host-store";
import type { Restriction } from "@repo/contracts";
import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import type { ConferenceApi, RestrictedAnswer } from "../src/matching-api";
import { appRouter } from "../src/server";
import { createCallerFactory, type Context } from "../src/gate";
import { rows } from "./programme";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;
const api = (answer: RestrictedAnswer): ConferenceApi => ({
  restricted: async () => answer,
  verdicts: async () => ({ status: "unavailable" }),
  writeTalks: async () => {
    throw new Error("not used");
  },
  check: async () => {
    throw new Error("not used");
  },
});
const viewer = { id: "u1", name: "Guest", email: "guest@example.com", image: null };

describe.skipIf(!url)("appRouter", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const store = { ...createProgramme(db, "ams"), ...createGuestData(db, "ams") };
  const caller = (ctx: Partial<Context>) =>
    createCallerFactory(appRouter)({
      store,
      organiser: createOrganiserStore(db, "ams"),
      log: createSyncLog(db, "ams"),
      demo: createDemoSettings(db, "ams"),
      api: api({ status: "unavailable" }),
      settings: { apiAddress: null, keySet: false },
      viewer,
      ...ctx,
    });

  beforeAll(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, rows);
    await db.delete(amsTables.demoSettings);
    await store.unstar("u1", { targetKind: "talk", targetId: "T1" });
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("everything but viewer.get needs a signed-in viewer", async () => {
    const anon = caller({ viewer: null });
    expect(await anon.viewer.get()).toBeNull();
    await expect(anon.meeting.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anon.talks.get({ id: "T1" })).rejects.toBeInstanceOf(TRPCError);
  });

  test("programme reads", async () => {
    const c = caller({});
    expect((await c.meeting.get()).name).toBe("Test Meeting");
    expect(await c.days.list()).toEqual([{ date: "2026-01-27", sessions: 1 }]);
    expect((await c.days.sessions({ date: "2026-01-27" })).map((s) => s.id)).toEqual(["S1"]);
    expect((await c.sessions.get({ id: "S1" })).talks.map((t) => t.id)).toEqual(["T1", "T2"]);
    expect((await c.tracks.get({ id: "P1" })).sessions).toHaveLength(1);
    expect((await c.people.get({ id: "ada-author" })).talks).toHaveLength(2);
    expect((await c.search({ q: "storms" })).talks.map((t) => t.id)).toEqual(["T1", "T2"]);
  });

  test("unknown ids are NOT_FOUND and bad input is BAD_REQUEST", async () => {
    const c = caller({});
    await expect(c.talks.get({ id: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(c.sessions.get({ id: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(c.search({ q: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(c.talks.get({ id: "../etc" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("related talks come from the API, joined to this programme", async () => {
    const match = { basedOn: "T1", talk: "T2", match: true, shared: ["technique" as const], kind: "unexpected" as const, rank: 1, restriction: { type: "conference" as const }, score: 0.9, description: "r", methods: [], programmeVersion: "pv" };
    const c = caller({ api: api({ status: "ok", matches: [match], judging: [] }) });
    const got = await c.talks.related({ id: "T1" });
    expect(got.status).toBe("matches");
    expect(got.status === "matches" && got.matches[0]!.talk.id).toBe("T2");
    expect(await caller({}).talks.related({ id: "T1" })).toEqual({ status: "unavailable" });
  });

  test("stars and the schedule", async () => {
    const c = caller({});
    await c.schedule.star({ targetKind: "talk", targetId: "T1" });
    expect(await c.schedule.starred()).toEqual([{ targetKind: "talk", targetId: "T1" }]);
    expect((await c.schedule.get()).talks.map((t) => t.id)).toEqual(["T1"]);
    await c.schedule.unstar({ targetKind: "talk", targetId: "T1" });
    expect((await c.schedule.get()).talks).toEqual([]);
  });

  test("notes", async () => {
    const c = caller({});
    await c.notes.save({ targetKind: "talk", targetId: "T2", body: "Ask about the data." });
    expect((await c.notes.get({ targetKind: "talk", targetId: "T2" }))?.body).toBe("Ask about the data.");
    expect((await c.notes.list()).map((n) => n.title)).toEqual(["Talk about storms T2"]);
    await c.notes.remove({ targetKind: "talk", targetId: "T2" });
    expect(await c.notes.get({ targetKind: "talk", targetId: "T2" })).toBeNull();
  });

  test("the programmes AMS's menu opens by name, the highlight lists and the pages of names", async () => {
    const c = caller({});
    expect((await c.tracks.list()).map((t) => t.id)).toEqual(["P1"]);
    expect((await c.tracks.byCode({ code: "EXHIBITHALL" })).sessions.map((s) => s.id)).toEqual(["B1"]);
    await expect(c.tracks.byCode({ code: "EVENT" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await c.highlights.get({ list: "themed" })).sessions.map((s) => s.id)).toEqual(["S1"]);
    expect((await c.highlights.get({ list: "keynotes" })).talks.map((t) => t.id)).toEqual(["T2"]);
    expect(await c.names.get({ page: "officers" })).toEqual([{ heading: "Local Organizing Committee", lines: ["Ada Author, Chair"] }]);
  });

  test("our improvements see the fixed abstract, its session's conferences, and the matching API's pools around it, by kind", async () => {
    const result = (talk: string, restriction: Restriction, rank = 1) => ({ basedOn: "T1", talk, match: true, shared: ["technique" as const], kind: "unexpected" as const, rank, restriction, score: 0.9, description: `Why ${talk}`, methods: [], programmeVersion: "pv" });
    const asked: unknown[] = [];
    const answering: ConferenceApi = {
      ...api({ status: "unavailable" }),
      restricted: async (talkId, restrictions) => (
        asked.push([talkId, restrictions]),
        {
          status: "ok",
          matches: [
            result("T2", { type: "conference" }),
            result("T2", { type: "subConference", id: "P1" }),
            result("T2", { type: "subConference", id: "Hydrology and Water" }),
            result("T2", { type: "day", id: "2026-01-27" }),
            result("T2", { type: "timeBlock", id: "2026-01-27T13:45:00-06:00" }),
            result("T2", { type: "session", id: "S1" }, 1),
            result("T9", { type: "session", id: "S1" }, 2),
            result("T1", { type: "session", id: "S1" }, 3),
          ],
          judging: [{ basedOn: "T1", restriction: { type: "session", id: "S9" } }],
        }
      ),
    };
    const around = await caller({ api: answering }).improvements.aroundAbstract();
    expect(asked).toEqual([["T1", ["subConference", "day", "timeBlock", "session"]]]);
    const education = { id: "P1", code: "EDU", title: "Education" };
    const t2 = { talk: expect.objectContaining({ id: "T2", sessionId: "S1" }), kind: "unexpected", score: 0.9, reason: "Why T2", tracks: [education] };
    const t1 = { talk: expect.objectContaining({ id: "T1" }), kind: "unexpected", score: 0.9, reason: "Why T1", tracks: [education] };
    expect(around).toEqual({
      abstract: expect.objectContaining({ id: "T1" }),
      abstractTrackIds: ["P1"],
      pools: {
        subConference: [{ id: "P1", matches: [t2] }],
        day: [{ id: "2026-01-27", matches: [t2] }],
        timeBlock: [{ id: "2026-01-27T19:45:00.000Z", matches: [t2] }],
        session: [{ id: "S1", matches: [t2, t1] }],
      },
    });
    const down = await caller({}).improvements.aroundAbstract();
    expect(down).toEqual({ abstract: expect.objectContaining({ id: "T1" }), abstractTrackIds: ["P1"], pools: null });
  });

  test("the developer console fixes the demo to a talk, and names why a talk is refused", async () => {
    const c = caller({});
    expect((await c.developer.fixedAbstract())?.id).toBe("T1");
    expect((await c.developer.setFixedAbstract({ talkId: "T2" })).id).toBe("T2");
    expect((await c.improvements.aroundAbstract()).abstract?.id).toBe("T2");
    await expect(c.developer.setFixedAbstract({ talkId: "nope" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "That talk cannot be the demo's abstract: it must be shown, and have an abstract.",
    });
    await c.developer.setFixedAbstract({ talkId: "T1" });
  });
});
