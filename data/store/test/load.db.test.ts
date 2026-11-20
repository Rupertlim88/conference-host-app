import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams";
import { connect, type Db } from "../src/db";
import { migrateStore } from "../src/migrate";
import { GsaFilesSchema, gsaRows } from "../src/gsa";
import { loadRows } from "../src/load-rows";
import { amsTables, gsaTables } from "../src/schema";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

describe.skipIf(!url)("loading rows into Postgres", { timeout: 60_000 }, () => {
  // vitest collects a skipped describe body too, so nothing here may assume a database.
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const ams = amsRows(AmsFilesSchema.parse(fixture("ams-slice.json")));
  const gsa = gsaRows(GsaFilesSchema.parse(fixture("gsa-slice.json")));

  beforeAll(async () => {
    await db.execute(sql`drop schema if exists ams2027 cascade`);
    await db.execute(sql`drop schema if exists gsa2026 cascade`);
    await db.execute(sql`drop schema if exists sign_in cascade`);
    await db.execute(sql`drop table if exists drizzle.__host_store_migrations`);
    await migrateStore(db);
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("loads a society and a second load changes nothing", async () => {
    const first = await loadRows(db, amsTables, ams);
    const second = await loadRows(db, amsTables, ams);
    expect(second).toEqual(first);
    expect(first).toEqual({ tracks: 4, sessions: 2, talks: 7, people: 6 });
    const [row] = await db.select().from(amsTables.talks).where(eq(amsTables.talks.number, "J7.1"));
    expect(row?.startsAt?.toISOString()).toBe("2026-01-27T19:45:00.000Z");
    expect(row?.presentingAuthor).toBe("William J Graff");
  });

  test("a load records the published programme beside the live one and undoes organiser edits", async () => {
    await db.execute(sql`update ams2027.talks set session_id = '73941', room = 'Moved', withdrawn = true where id = '464598'`);
    await db.execute(sql`update ams2027.sessions set starts_at = starts_at + interval '1 hour', room = 'Moved' where id = '73193'`);
    await loadRows(db, amsTables, ams);
    const [talk] = await db.execute<Record<string, unknown>>(sql`
      select session_id, pub_session_id, room, pub_room, building, pub_building, sort, pub_sort,
             starts_at = pub_starts_at as same_start, ends_at = pub_ends_at as same_end, withdrawn
      from ams2027.talks where id = '464598'`);
    expect(talk).toEqual({
      session_id: "73193",
      pub_session_id: "73193",
      room: "350D",
      pub_room: "350D",
      building: "George R. Brown Convention Center",
      pub_building: "George R. Brown Convention Center",
      sort: 0,
      pub_sort: 0,
      same_start: true,
      same_end: true,
      withdrawn: false,
    });
    const [session] = await db.execute<Record<string, unknown>>(sql`
      select to_char(starts_at at time zone 'UTC', 'HH24:MI') as start, room, pub_room,
             starts_at = pub_starts_at as same_start, ends_at = pub_ends_at as same_end, building = pub_building as same_building
      from ams2027.sessions where id = '73193'`);
    expect(session).toEqual({ start: "19:45", room: "350D", pub_room: "350D", same_start: true, same_end: true, same_building: true });
  });

  test("keeps the societies apart", async () => {
    await loadRows(db, gsaTables, gsa);
    const amsIds = (await db.select({ id: amsTables.talks.id }).from(amsTables.talks)).map((r) => r.id);
    expect(amsIds).not.toContain("16121");
    expect(await db.$count(gsaTables.talks)).toBe(15);
  });

  test("a reload drops talks no longer in the files, with their people links", async () => {
    const fewer = { ...ams, talks: ams.talks.filter((t) => t.number !== "J7.5") };
    fewer.talkPeople = fewer.talkPeople.filter((l) => fewer.talks.some((t) => t.id === l.talkId));
    await loadRows(db, amsTables, fewer);
    expect(await db.$count(amsTables.talks)).toBe(6);
    const links = await db.select().from(amsTables.talkPeople);
    expect(links.every((l) => fewer.talks.some((t) => t.id === l.talkId))).toBe(true);
  });
});
