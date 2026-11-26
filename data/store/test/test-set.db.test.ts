import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams-rows";
import { connect, type Db } from "../src/connect";
import { createDemoSettings } from "../src/demo-settings";
import { loadRows, type SocietyRows } from "../src/load";
import { migrateStore } from "../src/migrate";
import { amsTables } from "../src/tables";
import { createTestSets } from "../src/test-set";
import { createStore } from "./store";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

// The AMS slice: joint session 73193 (J7) holds J7.1–J7.5; session 73941 (7) holds the poster 7.4A; break 463533 has
// no session. Session 75206 is the exhibit hall's one listing.
const J71 = "464598";
const J72 = "470089";
const J74 = "474059";
const POSTER = "463094";
const ALL = ["463094", "463533", "464598", "470089", "474059", "477728", "477914"];
const USER = "test-set-store-test";

describe.skipIf(!url)("the latest test set", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const testSets = createTestSets(db, "ams");
  const attendee = createStore(db, "ams");
  const demo = createDemoSettings(db, "ams");
  const rows = amsRows(AmsFilesSchema.parse(fixture("ams-slice.json")));
  const sampleOf = (ids: string[]): SocietyRows => ({ ...rows, talks: rows.talks.filter((t) => ids.includes(t.id)) });
  const held = async () => (await attendee.talkSummaries(ALL)).map((t) => t.id).sort();
  const testSet = (askers: string[], talks: string[]) => ({ conference: "ams-2027", askers, talks });

  beforeEach(async () => {
    await migrateStore(db);
    await db.execute(sql`delete from ams2027.test_set`);
    await db.execute(sql`delete from ams2027.demo_settings`);
    await loadRows(db, amsTables, rows, sampleOf([J71]));
  });
  afterAll(async () => {
    await db?.execute(sql`delete from ams2027.test_set`);
    await conn?.close();
  });

  test("until a test set arrives there is none, and the demo holds the sample", async () => {
    expect(await testSets.latest()).toBeNull();
    expect(await held()).toEqual([J71]);
  });

  test("storing a test set makes the demo hold exactly its talks, with every session and conference kept", async () => {
    await testSets.hold(testSet([J72], [J72, POSTER]));
    expect(await held()).toEqual([POSTER, J72]);
    expect(await db.$count(amsTables.sessions)).toBe(3);
    expect(await db.$count(amsTables.tracks)).toBe(5);
    expect((await attendee.session("73193"))?.talks.map((t) => t.id)).toEqual([J72]);
    expect(await testSets.latest()).toEqual(testSet([J72], [J72, POSTER]));
  });

  test("a held talk comes with its people, and only held talks' people are listed", async () => {
    await testSets.hold(testSet([J72], [J72]));
    expect((await attendee.people()).map((p) => p.name)).toEqual([rows.talks.find((t) => t.id === J72)!.presentingAuthor]);
  });

  test("storing a test set fixes the demo to its first abstract", async () => {
    await demo.setFixedAbstract(J71);
    await testSets.hold(testSet([J74, J72], [J72, J74]));
    expect((await demo.fixedAbstract())?.id).toBe(J74);
  });

  test("holding restarts the demo's programme: organisers' edits go away, and stars and notes stay", async () => {
    await db.execute(sql`update ams2027.talks set withdrawn = true, room = 'Moved' where id = ${J71}`);
    await db.execute(sql`update ams2027.sessions set starts_at = starts_at + interval '1 hour', room = 'Moved' where id = '73193'`);
    await attendee.star(USER, { targetKind: "talk", targetId: J71 });
    await attendee.saveNote(USER, { targetKind: "talk", targetId: J71 }, "Go early.");
    await testSets.hold(testSet([J72], [J71, J72]));
    const [talk] = await db.execute<Record<string, unknown>>(sql`
      select withdrawn, room = pub_room as same_room from ams2027.talks where id = ${J71}`);
    expect(talk).toEqual({ withdrawn: false, same_room: true });
    const [session] = await db.execute<Record<string, unknown>>(sql`
      select starts_at = pub_starts_at as same_start, room = pub_room as same_room from ams2027.sessions where id = '73193'`);
    expect(session).toEqual({ same_start: true, same_room: true });
    expect(await db.$count(amsTables.stars, sql`user_id = ${USER}`)).toBe(1);
    expect(await db.$count(amsTables.notes, sql`user_id = ${USER}`)).toBe(1);
  });

  test("a later test set replaces the one before", async () => {
    await testSets.hold(testSet([J72], [J72, POSTER]));
    await testSets.hold(testSet([J74], [J74]));
    expect(await testSets.latest()).toEqual(testSet([J74], [J74]));
    expect(await held()).toEqual([J74]);
  });

  test("loading again keeps the latest test set and holds its talks, and keeps the abstract the developer set", async () => {
    await testSets.hold(testSet([J72], [J72, J74]));
    await demo.setFixedAbstract(J74);
    await loadRows(db, amsTables, rows, sampleOf([J71]));
    expect(await held()).toEqual([J72, J74]);
    expect((await demo.fixedAbstract())?.id).toBe(J74);
  });

  test("a test set that fails partway changes nothing", async () => {
    await testSets.hold(testSet([J72], [J72]));
    await expect(testSets.hold(testSet(["not\u0000an id"], [J74]))).rejects.toThrow();
    expect(await held()).toEqual([J72]);
    expect(await testSets.latest()).toEqual(testSet([J72], [J72]));
  });
});
