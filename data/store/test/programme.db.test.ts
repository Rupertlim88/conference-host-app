import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PersonDetailSchema,
  SessionDetailSchema,
  TalkDetailSchema,
  TrackDetailSchema,
} from "@repo/host-contracts";
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

describe.skipIf(!url)("store queries", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const ams = createStore(db, "ams");

  beforeAll(async () => {
    await db.execute(sql`drop schema if exists ams2027 cascade`);
    // A database used before GSA was removed still has its schema, which migration 0000 would create again.
    await db.execute(sql`drop schema if exists gsa2026 cascade`);
    await db.execute(sql`drop schema if exists sign_in cascade`);
    await db.execute(sql`drop table if exists drizzle.__host_store_migrations`);
    await migrateStore(db);
    await loadRows(db, amsTables, amsRows(AmsFilesSchema.parse(fixture("ams-slice.json"))));
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("ping reads the database once and returns nothing", async () => {
    await expect(ams.ping()).resolves.toBeUndefined();
  });

  test("meeting", async () => {
    expect((await ams.meeting()).timeZone).toBe("America/Denver");
    expect((await ams.meeting()).name).toContain("AMS Annual Meeting");
  });

  test("days count sessions by the meeting's own calendar date", async () => {
    expect(await ams.days()).toEqual([{ date: "2026-01-27", sessions: 2 }]);
  });

  test("sessions on a day come in start order", async () => {
    const day = await ams.sessionsOn("2026-01-27");
    expect(day.map((s) => s.id).sort()).toEqual(["73193", "73941"]);
    const starts = day.map((s) => s.startsAt!);
    expect(starts).toEqual([...starts].sort());
    expect(day.find((s) => s.id === "73193")!.startsAt).toBe("2026-01-27T19:45:00.000Z");
  });

  test("a session has its tracks and its talks in order", async () => {
    const s = SessionDetailSchema.parse(await ams.session("73193"));
    expect(s.tracks.map((t) => t.code).sort()).toEqual(["EDUCATION", "MIDDLE"]);
    expect(s.talks.map((t) => t.number)).toEqual(["J7.1", "J7.2", "J7.3", "J7.4", "J7.5"]);
    expect(await ams.session("nope")).toBeNull();
  });

  test("a talk has its abstract and its session", async () => {
    const t = TalkDetailSchema.parse(await ams.talk("464598"));
    expect(t.number).toBe("J7.1");
    expect(t.session?.number).toBe("J7");
    expect(t.abstract.length).toBeGreaterThan(100);
    expect(await ams.talk("16121")).toBeNull();
  });

  test("talk summaries come back in the order asked, skipping unknown ids", async () => {
    const got = await ams.talkSummaries(["477728", "missing", "464598"]);
    expect(got.map((t) => t.id)).toEqual(["477728", "464598"]);
  });

  test("a track lists its sessions", async () => {
    const t = TrackDetailSchema.parse(await ams.track("1878"));
    expect(t.sessions.map((s) => s.id)).toEqual(["73193"]);
  });

  test("tracks are in their loaded order", async () => {
    expect((await ams.tracks()).map((t) => t.code)).toEqual(["EDUCATION", "MIDDLE", "TROPICAL", "TOWNHALL"]);
  });

  test("people are listed by name, and a person lists their talks", async () => {
    const people = await ams.people();
    expect(people.map((p) => p.name)).toEqual([...people.map((p) => p.name)].sort((a, b) => a.localeCompare(b)));
    const p = PersonDetailSchema.parse(await ams.person("william-j-graff"));
    expect(p.talks.map((t) => t.number)).toEqual(["J7.1"]);
  });

  test("search finds talks by title, number and presenter, and sessions and people", async () => {
    expect((await ams.search("storm")).talks.map((t) => t.number)).toContain("J7.1");
    expect((await ams.search("J7.3")).talks.map((t) => t.number)).toEqual(["J7.3"]);
    expect((await ams.search("oehrlein")).people.map((p) => p.name)).toEqual(["Jessica Oehrlein"]);
    expect((await ams.search("cloud-radiative")).sessions.map((s) => s.id)).toEqual(["73941"]);
  });

  test("search treats % and _ as plain characters", async () => {
    expect((await ams.search("%%")).talks).toEqual([]);
    expect((await ams.search("__")).talks).toEqual([]);
  });

  test("a programme AMS's menu opens by name is found by its code, with its sessions", async () => {
    const hall = await ams.trackByCode("EXHIBITHALL");
    expect(TrackDetailSchema.parse(hall)).toMatchObject({ id: "1947", title: "Main Exhibit Hall" });
    expect(hall?.sessions.map((s) => s.id)).toEqual(["75206"]);
    expect(await ams.trackByCode("EVENT")).toBeNull();
  });

  test("each highlight list gives its sessions or its shown talks", async () => {
    expect((await ams.highlight("themed")).sessions.map((s) => s.id)).toEqual(["73193"]);
    expect((await ams.highlight("keynotes")).talks.map((t) => t.id)).toEqual(["470089"]);
    expect((await ams.highlight("supplementary")).talks.map((t) => t.id)).toEqual(["464598"]);
    expect(await ams.highlight("fellows")).toEqual({ sessions: [], talks: [] });
    expect(await ams.highlight("posters")).toEqual({ sessions: [], talks: [] });
  });

  test("a page of names comes back heading by heading, in order", async () => {
    expect(await ams.namePage("officers")).toEqual([
      { heading: "Local Organizing Committee", lines: ["Melissa Burt and Scott Mackaro, Co-Chairs", "Stephanie Herring"] },
    ]);
  });
});
