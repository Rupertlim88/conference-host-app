import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams-rows";
import { connect, type Db } from "../src/connect";
import { migrateStore } from "../src/migrate";
import { loadRows } from "../src/load";
import { createStore } from "./store";
import { amsTables } from "../src/tables";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

describe.skipIf(!url)("stars, notes and the sync list", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const ams = createStore(db, "ams");

  beforeAll(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, amsRows(AmsFilesSchema.parse(fixture("ams-slice.json"))));
    await db.execute(sql`delete from ams2027.stars`);
    await db.execute(sql`delete from ams2027.notes`);
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("starring a talk twice keeps one star; unstarring removes it", async () => {
    await ams.star("u1", { targetKind: "talk", targetId: "464598" });
    await ams.star("u1", { targetKind: "talk", targetId: "464598" });
    expect((await ams.starred("u1")).length).toBe(1);
    expect((await ams.schedule("u1")).talks.map((t) => t.number)).toEqual(["J7.1"]);
    await ams.unstar("u1", { targetKind: "talk", targetId: "464598" });
    expect(await ams.starred("u1")).toEqual([]);
  });

  test("stars belong to one person", async () => {
    await ams.star("u1", { targetKind: "session", targetId: "73193" });
    expect(await ams.starred("u2")).toEqual([]);
    expect((await ams.schedule("u1")).sessions.map((s) => s.id)).toEqual(["73193"]);
  });

  test("a note is saved, replaced, listed with its title, and deleted", async () => {
    const target = { targetKind: "talk", targetId: "464598" } as const;
    await ams.saveNote("u1", target, "first");
    await ams.saveNote("u1", target, "second");
    expect((await ams.note("u1", target))?.body).toBe("second");
    const notes = await ams.notes("u1");
    expect(notes).toHaveLength(1);
    expect(notes[0]!.title).toContain("Into the Storm");
    await ams.deleteNote("u1", target);
    expect(await ams.note("u1", target)).toBeNull();
  });

  test("an empty note is deleted rather than saved", async () => {
    const target = { targetKind: "session", targetId: "73193" } as const;
    await ams.saveNote("u1", target, "keep");
    await ams.saveNote("u1", target, "   ");
    expect(await ams.note("u1", target)).toBeNull();
  });

  test("the sync list has every talk with its session and times", async () => {
    const all = await ams.talksForSync();
    expect(all).toHaveLength(7);
    const j71 = all.find((x) => x.number === "J7.1")!;
    expect(j71).toMatchObject({ id: "464598", sessionId: "73193", sessionTitle: expect.stringContaining("Beyond the Basics") });
    expect(j71.startsAt?.toISOString()).toBe("2026-01-27T19:45:00.000Z");
  });

  test("each talk in the sync list carries its session's start on the meeting's clock, with its offset", async () => {
    const all = await ams.talksForSync();
    const j71 = all.find((x) => x.number === "J7.1")!;
    // Session 73193 starts at 19:45 UTC: 12:45 in Denver, the meeting's zone, in January.
    expect(j71.sessionStart).toBe("2026-01-27T12:45:00-07:00");
  });
});
