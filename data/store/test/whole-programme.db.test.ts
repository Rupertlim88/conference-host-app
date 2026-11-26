import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams-rows";
import { connect, type Db } from "../src/connect";
import { loadRows, type SocietyRows } from "../src/load";
import { migrateStore } from "../src/migrate";
import { amsTables } from "../src/tables";
import { createWholeProgramme } from "../src/whole-programme";
import { createStore } from "./store";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

// The AMS slice: joint session 73193 (J7, in conferences 1878 and 1891, 19:45 UTC on 27 January 2026) holds
// J7.1–J7.5, each in 1878 only; session 73941 (7, in 1912) holds the poster 7.4A; break 463533 has no session.
const J71 = "464598";
const J75 = "477914";
const POSTER = "463094";
const BREAK = "463533";
const ALL = ["463094", "463533", "464598", "470089", "474059", "477728", "477914"];

describe.skipIf(!url)("AMS's whole published programme", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const whole = createWholeProgramme(db, "ams");
  const attendee = createStore(db, "ams");
  const rows = amsRows(AmsFilesSchema.parse(fixture("ams-slice.json")));
  /** The demo's sample, as the load command would pass it: only these talks. */
  const sampleOf = (ids: string[]): SocietyRows => ({ ...rows, talks: rows.talks.filter((t) => ids.includes(t.id)) });
  const ids = async () => (await whole.contents()).talks.map((t) => t.id).sort();

  beforeEach(async () => {
    await migrateStore(db);
    await db.execute(sql`delete from ams2027.test_set`);
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("loading keeps every talk AMS publishes, while the attendee app sees only the sample the demo holds", async () => {
    await loadRows(db, amsTables, rows, sampleOf([J71, POSTER]));
    expect(await ids()).toEqual(ALL);
    expect((await attendee.talkSummaries(ALL)).map((t) => t.id)).toEqual([POSTER, J71]);
  });

  test("each talk is kept with its session, its kind, whether it has an abstract, and its conferences", async () => {
    await loadRows(db, amsTables, rows, sampleOf([J71]));
    const talks = (await whole.contents()).talks;
    expect(talks.find((t) => t.id === J71)).toMatchObject({ sessionId: "73193", kind: "oral", hasAbstract: true, trackIds: ["1878"] });
    expect(talks.find((t) => t.id === BREAK)).toMatchObject({ sessionId: null, kind: "break", hasAbstract: false, trackIds: ["1926"] });
  });

  test("each session gives its published start on the meeting's clock, even after an organiser moves it", async () => {
    await loadRows(db, amsTables, rows, sampleOf([J71]));
    await db.execute(sql`update ams2027.sessions set starts_at = starts_at + interval '1 hour' where id = '73193'`);
    const sessions = (await whole.contents()).sessions;
    expect(sessions.find((s) => s.id === "73193")).toEqual({ id: "73193", start: "2026-01-27T12:45:00-07:00", trackIds: ["1878", "1891"] });
    expect(sessions.find((s) => s.id === "75206")).toEqual({ id: "75206", start: null, trackIds: ["1947"] });
  });

  test("the conferences come in AMS's order, with their titles", async () => {
    await loadRows(db, amsTables, rows, sampleOf([J71]));
    expect((await whole.contents()).tracks.map((t) => t.id)).toEqual(["1878", "1891", "1912", "1926", "1947"]);
  });

  test("a reload drops talks AMS no longer publishes", async () => {
    await loadRows(db, amsTables, rows, sampleOf([J71]));
    const fewer = { ...rows, talks: rows.talks.filter((t) => t.id !== J75) };
    fewer.talkPeople = fewer.talkPeople.filter((l) => l.talkId !== J75);
    await loadRows(db, amsTables, fewer, sampleOf([J71]));
    expect(await ids()).toEqual(ALL.filter((id) => id !== J75));
  });
});
