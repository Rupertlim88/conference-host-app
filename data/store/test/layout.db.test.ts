import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams-rows";
import { connect, type Db } from "../src/connect";
import { loadRows } from "../src/load";
import { migrateStore } from "../src/migrate";
import { amsTables } from "../src/tables";
import { createTestSets } from "../src/test-set";
import { createStore } from "./store";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

// The AMS slice: joint session 73193 (J7) holds J7.1, J7.2 and J7.4, in the Education conference (1878) among others;
// session 73941 (7) holds the poster 7.4A. The meeting's clock is Denver's.
const J71 = "464598";
const J72 = "470089";
const J74 = "474059";
const POSTER = "463094";
const HELD = [J71, J72, J74, POSTER];

describe.skipIf(!url)("where each held talk sits", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const testSets = createTestSets(db, "ams");
  const store = createStore(db, "ams");
  const rows = amsRows(AmsFilesSchema.parse(fixture("ams-slice.json")));
  const sent = async (id: string) => (await store.talksForSync()).find((t) => t.id === id)!;

  beforeEach(async () => {
    await migrateStore(db);
    await db.execute(sql`delete from ams2027.test_set`);
    await loadRows(db, amsTables, rows, HELD);
  });
  afterAll(async () => {
    await db?.execute(sql`delete from ams2027.test_set`);
    await conn?.close();
  });

  test("without a layout, each held talk sits where AMS placed it, and a send carries it there", async () => {
    const amsSession = await store.session("73193");
    const placed = await store.seating();
    expect(placed.laidOut).toBe(false);
    expect(placed.talks.find((t) => t.id === J72)).toEqual({ id: J72, sessionId: "73193", trackIds: rows.talks.find((t) => t.id === J72)!.trackIds });
    expect(placed.sessions.find((s) => s.id === "73193")).toEqual({
      id: "73193",
      startsAt: amsSession!.startsAt,
      talks: [J71, J72, J74],
      trackIds: amsSession!.trackIds,
    });
    expect((await sent(J72)).sessionId).toBe("73193");
  });

  test("with a layout, each talk sits in the layout's session, at its start there, and in its conferences; one placed nowhere sits nowhere", async () => {
    const layout = {
      timeBlocks: [{ start: "2026-01-28T09:00", sessions: ["73941"] }],
      sessions: [{ id: "73941", start: "2026-01-28T09:00", talks: [J74, J72] }],
      conferences: [{ trackId: "1912", title: "First Symposium on Tropical Meteorology and Climate", talks: [J72] }],
    };
    await testSets.hold({ conference: "ams-2027", askers: [J72], talks: HELD, layout });
    const poster = await store.session("73941");

    const j72 = await sent(J72);
    expect([j72.sessionId, j72.sessionTitle, j72.sessionFormat, j72.sessionStart, j72.trackIds]).toEqual([
      "73941",
      poster!.title,
      poster!.format,
      "2026-01-28T09:00:00-07:00",
      ["1912"],
    ]);
    const j71 = await sent(J71);
    expect([j71.sessionId, j71.sessionTitle, j71.sessionStart, j71.trackIds]).toEqual([null, null, null, []]);

    const placed = await store.seating();
    expect(placed.laidOut).toBe(true);
    expect(placed.sessions).toEqual([{ id: "73941", startsAt: "2026-01-28T16:00:00.000Z", talks: [J74, J72], trackIds: ["1912"] }]);
    expect(placed.talks.find((t) => t.id === J71)).toEqual({ id: J71, sessionId: null, trackIds: [] });
    expect(placed.talks.find((t) => t.id === J72)).toEqual({ id: J72, sessionId: "73941", trackIds: ["1912"] });
  });

  test("the base keeps AMS's placement while a layout is held", async () => {
    await testSets.hold({
      conference: "ams-2027",
      askers: [J72],
      talks: HELD,
      layout: { timeBlocks: [], sessions: [], conferences: [] },
    });
    expect((await store.session("73193"))?.talks.map((t) => t.id)).toEqual([J71, J72, J74]);
    expect((await store.talkSummaries([J72]))[0]?.sessionId).toBe("73193");
  });

  test("each session's short form comes back by its id, and an unknown session has none", async () => {
    const amsSession = await store.session("73193");
    const [summary, ...rest] = await store.sessionSummaries(["73193", "nope"]);
    expect(rest).toEqual([]);
    expect(summary).toMatchObject({ id: "73193", title: amsSession!.title, startsAt: amsSession!.startsAt });
  });
});
