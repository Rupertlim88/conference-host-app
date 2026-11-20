import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams";
import { connect, type Db } from "../src/db";
import { loadRows } from "../src/load-rows";
import { migrateStore } from "../src/migrate";
import { createStore } from "../src/queries";
import { amsTables } from "../src/schema";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

// J7.1 (464598) is withdrawn; J7.2 (470089) in the same session stays. William J Graff presents only J7.1.
const GONE = "464598";
const KEPT = "470089";
const USER = "withdrawn-reader";

describe.skipIf(!url)("a withdrawn talk", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const ams = createStore(db, "ams");
  const ids = (talks: { id: string }[]) => talks.map((t) => t.id);

  beforeAll(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, amsRows(AmsFilesSchema.parse(fixture("ams-slice.json"))));
    await db.execute(sql`delete from ams2027.stars`);
    await db.execute(sql`delete from ams2027.notes`);
    for (const targetId of [GONE, KEPT]) {
      await ams.star(USER, { targetKind: "talk", targetId });
      await ams.saveNote(USER, { targetKind: "talk", targetId }, `note on ${targetId}`);
    }
    await db.execute(sql`update ams2027.talks set withdrawn = true where id = ${GONE}`);
  });
  afterAll(async () => {
    await conn?.close();
  });

  const reads: [string, () => Promise<string[]>][] = [
    ["its session", async () => ids((await ams.session("73193"))!.talks)],
    ["talk summaries", async () => ids(await ams.talkSummaries([GONE, KEPT]))],
    ["search", async () => ids((await ams.search("J7.")).talks)],
    ["the schedule", async () => ids((await ams.schedule(USER)).talks)],
    ["the notes list", async () => (await ams.notes(USER)).map((n) => n.targetId)],
    ["the sync list", async () => ids(await ams.talksForSync())],
    ["the starred list", async () => (await ams.starred(USER)).map((t) => t.targetId)],
  ];
  test.each(reads)("is left out of %s, and the other talks stay", async (_, read) => {
    const got = await read();
    expect(got).toContain(KEPT);
    expect(got).not.toContain(GONE);
  });

  test("has no talk page", async () => {
    expect(await ams.talk(GONE)).toBeNull();
    expect(await ams.talk(KEPT)).not.toBeNull();
  });

  test("is left out of its presenter's talks, and a presenter with no other talk is left out of people", async () => {
    expect((await ams.person("william-j-graff"))?.talks ?? []).toEqual([]);
    expect((await ams.people()).map((p) => p.id)).not.toContain("william-j-graff");
    expect((await ams.search("Graff")).people).toEqual([]);
  });

  test("keeps its stars and notes, which come back when it is restored", async () => {
    await db.execute(sql`update ams2027.talks set withdrawn = false where id = ${GONE}`);
    expect(ids((await ams.schedule(USER)).talks)).toContain(GONE);
    expect((await ams.notes(USER)).map((n) => n.targetId)).toContain(GONE);
  });
});
