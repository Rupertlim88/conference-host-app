import { migrateStore } from "@repo/host-store/migrate";
import { amsTables, connect, createOrganiserStore, createStore, createSyncLog, loadRows, type Db } from "@repo/host-store";
import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import type { ConferenceApi, RelatedAnswer } from "../src/conference-api";
import { appRouter } from "../src/router";
import { createCallerFactory, type Context } from "../src/trpc";
import { rows } from "./programme";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;
const api = (answer: RelatedAnswer): ConferenceApi => ({
  related: async () => answer,
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
  const store = createStore(db, "ams");
  const caller = (ctx: Partial<Context>) =>
    createCallerFactory(appRouter)({
      store,
      organiser: createOrganiserStore(db, "ams"),
      log: createSyncLog(db, "ams"),
      api: api({ status: "unavailable" }),
      settings: { apiAddress: null, keySet: false },
      viewer,
      ...ctx,
    });

  beforeAll(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, rows);
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
    const match = { talk: "T2", kind: "unexpected" as const, rank: 1, score: 0.9, reason: "r", sharedMethods: [], programmeVersion: "pv" };
    const c = caller({ api: api({ status: "ok", matches: [match] }) });
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

  test("session kinds", async () => {
    const c = caller({});
    expect(await c.sessions.kinds()).toEqual([{ kind: "Session", sessions: 1 }]);
    expect((await c.sessions.ofKind({ kind: "Session" })).map((s) => s.id)).toEqual(["S1"]);
  });
});
