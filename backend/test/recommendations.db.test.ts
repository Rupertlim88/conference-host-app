import type { Match, Restriction } from "@repo/contracts";
import {
  amsTables,
  connect,
  createProgramme,
  createSyncLog,
  createTestSets,
  loadRows,
  type Db,
  type SocietyRows,
  type TalkRow,
} from "@repo/host-store";
import { migrateStore } from "@repo/host-store/migrate";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import type { ConferenceApi, Judging } from "../src/matching-api";
import { answerRecommendations } from "../src/recommendations";
import { rows } from "./programme";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;

// The meeting's clock is Chicago's. S1 (in Education, P1) and the joint session S2 (Education and Hydrology, P3) start
// together at 1:45 PM on 27 January; S3 (Chemistry, P4) at 9:00 AM the next day. Each talk names only its own
// conference: T1 and T2 Education, T3, T4, T7 and T8 Hydrology, T5 and T6 Chemistry. T6 has no abstract, so it is
// never sent.
const base = rows.talks[0]!;
const talk = (id: string, sessionId: string, trackId: string, over: Partial<TalkRow> = {}): TalkRow => ({
  ...base,
  id,
  sessionId,
  number: id,
  title: `Talk ${id}`,
  trackIds: [trackId],
  coreKeynote: false,
  ...over,
});
const session = (id: string, startsAt: string, trackIds: string[]) => ({ ...rows.sessions[0]!, id, number: id, startsAt: new Date(startsAt), endsAt: null, trackIds });
const programme: SocietyRows = {
  ...rows,
  tracks: [...rows.tracks, { id: "P3", code: "HYDRO", title: "Hydrology", sort: 2, listed: true }, { id: "P4", code: "CHEM", title: "Chemistry", sort: 3, listed: true }],
  sessions: [session("S1", "2026-01-27T19:45:00Z", ["P1"]), session("S2", "2026-01-27T19:45:00Z", ["P1", "P3"]), session("S3", "2026-01-28T15:00:00Z", ["P4"]), rows.sessions[1]!],
  talks: [
    talk("T1", "S1", "P1"),
    talk("T2", "S1", "P1"),
    talk("T3", "S2", "P3"),
    talk("T4", "S2", "P3"),
    talk("T7", "S2", "P3"),
    talk("T8", "S2", "P3"),
    talk("T5", "S3", "P4"),
    talk("T6", "S3", "P4", { abstract: "" }),
  ],
  talkPeople: [],
  people: [],
};

const VERSION = "pv_8f3k2Qw9xLm0ZpT4vN7aBc";
const result = (basedOn: string, talkId: string, rank: number, restriction: Restriction): Match => ({
  basedOn,
  talk: talkId,
  kind: "core",
  rank,
  restriction,
  score: 0.9 - rank / 10,
  match: true,
  shared: ["technique"],
  description: `Why ${talkId} suits ${basedOn}.`,
  methods: [],
  programmeVersion: VERSION,
});

/** The matching API's matches around T1 under each standard restriction, as it lists them. */
const aroundT1: Match[] = [
  result("T1", "T4", 1, { type: "subConference", id: "P3" }),
  result("T1", "T3", 2, { type: "subConference", id: "P3" }),
  result("T1", "T5", 1, { type: "subConference", id: "P4" }),
  result("T1", "T3", 1, { type: "day", id: "2026-01-27" }),
  result("T1", "T2", 2, { type: "day", id: "2026-01-27" }),
  result("T1", "T4", 3, { type: "day", id: "2026-01-27" }),
  result("T1", "T7", 4, { type: "day", id: "2026-01-27" }),
  result("T1", "T4", 1, { type: "timeBlock", id: "2026-01-27T13:45:00-06:00" }),
  result("T1", "T2", 2, { type: "timeBlock", id: "2026-01-27T13:45:00-06:00" }),
  result("T1", "T2", 1, { type: "session", id: "S1" }),
  result("T1", "T4", 1, { type: "session", id: "S2" }),
  result("T1", "T3", 2, { type: "session", id: "S2" }),
];
const conferenceT1 = ["T3", "T5", "T2", "T4"].map((id, i) => result("T1", id, i + 1, { type: "conference" }));
/** The talks the matching API has judged from T1: T2 does not match, so it is not listed; T5, T7 and T8 it has not
 *  reached. */
const MATCHED_FROM_T1 = new Set(["T3", "T4"]);

const TALKS: Restriction = { type: "talks" };
const verdict = (basedOn: string, talkId: string, rank: number): Match => ({ ...result(basedOn, talkId, rank, TALKS), shared: ["intent"] });

/** The matching API, which runs elsewhere, as a script: it lists only the kinds a search asks for, and records every
 *  search for verdicts and every restricted search. */
function scripted(asked: { talkId: string; talks: string[] }[], over: Partial<ConferenceApi> = {}, searched: string[][] = []): ConferenceApi {
  return {
    restricted: async (talkId, kinds) => {
      searched.push(kinds);
      const listed = talkId === "T1" ? [...conferenceT1, ...aroundT1] : [];
      return { status: "ok", matches: listed.filter((m) => (kinds as string[]).includes(m.restriction!.type)), judging: [] };
    },
    verdicts: async (talkId, talks) => {
      asked.push({ talkId, talks });
      const matched = talkId === "T1" ? talks.filter((id) => MATCHED_FROM_T1.has(id)) : [];
      return { status: "ok", matches: matched.map((id, i) => verdict(talkId, id, i + 1)), judging: [] };
    },
    writeTalks: async () => {
      throw new Error("the report never writes");
    },
    check: async () => ({ outcome: { kind: "not-set" }, ms: 0 }),
    ...over,
  };
}

describe.skipIf(!url)("the report on an abstract tested", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const store = createProgramme(db, "ams");
  const log = createSyncLog(db, "ams");
  const testSets = createTestSets(db, "ams");
  const ask = (query: string, api: ConferenceApi) =>
    answerRecommendations(new Request(`http://localhost/api/recommendations${query}`), { store, testSets, log, api });

  beforeEach(async () => {
    await migrateStore(db);
    await db.execute(sql`delete from ams2027.test_set`);
    await db.execute(sql`delete from ams2027.sync_runs`);
    await loadRows(db, amsTables, programme);
    await testSets.hold({ conference: "ams-2027", askers: ["T1", "T3"], talks: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"] });
    const run = await log.start();
    await log.finish(run!.id, { sent: 7, added: 7, changed: 0, withdrawn: 0, unchanged: 0, programmeVersion: "pv_sent" });
  });
  afterAll(async () => {
    await db?.execute(sql`delete from ams2027.test_set`);
    await loadRows(db, amsTables, rows);
    await conn?.close();
  });

  test("gives each place's pool and what it shows, as the pages show it, the asker left out of its own pools", async () => {
    const res = await ask("?abstract=T1", scripted([]));
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(report.places.map((p: { layout: string; key: string; pool: string[]; shown: string[] }) => [p.layout, p.key, p.pool, p.shown])).toEqual([
      ["related", "T1", ["T2", "T3", "T4", "T5", "T7", "T8"], ["T3", "T5", "T2", "T4"]],
      ["conference_outside", "P3", ["T3", "T4", "T7", "T8"], ["T4"]],
      ["conference_outside", "P4", ["T5"], ["T5"]],
      ["conference_inside", "P1", ["T2"], []],
      ["day", "2026-01-27", ["T2", "T3", "T4", "T7", "T8"], ["T3", "T2", "T4"]],
      ["day", "2026-01-28", ["T5"], []],
      ["time_block", "2026-01-27T13:45", ["T2", "T3", "T4", "T7", "T8"], ["T4", "T2"]],
      ["time_block", "2026-01-28T09:00", ["T5"], []],
      ["session", "S1", ["T2"], ["T2"]],
      ["session", "S2", ["T3", "T4", "T7", "T8"], ["T4"]],
      ["session", "S3", ["T5"], []],
    ]);
  });

  test("asks in one search for what every place shows: the whole conference, and every one of each other kind", async () => {
    const searched: string[][] = [];
    await ask("?abstract=T1", scripted([], {}, searched));
    expect(searched).toEqual([["conference", "subConference", "day", "timeBlock", "session"]]);
  });

  test("asks for the verdicts on each place's pool, passes each on as the API gave it, and marks every talk it listed no verdict for", async () => {
    const asked: { talkId: string; talks: string[] }[] = [];
    const report = await (await ask("?abstract=T1", scripted(asked))).json();
    const related = report.places[0];
    expect(asked[0]).toEqual({ talkId: "T1", talks: ["T2", "T3", "T4", "T5", "T7", "T8"] });
    expect(asked).toHaveLength(report.places.length);
    expect(related.verdicts).toEqual([verdict("T1", "T3", 1), verdict("T1", "T4", 2)]);
    expect(related.notJudged).toEqual(["T2", "T5", "T7", "T8"]);
    expect(report.places.find((p: { key: string }) => p.key === "S3")).toMatchObject({ verdicts: [], notJudged: ["T5"] });
  });

  test("gives the programme version of the last send and of the matches", async () => {
    const report = await (await ask("?abstract=T1", scripted([]))).json();
    expect(report).toMatchObject({ abstract: "T1", sentProgrammeVersion: "pv_sent", matchesProgrammeVersion: VERSION });
  });

  test("for an abstract in a joint session, both its session's conferences are its own, so it shows nothing for either", async () => {
    const report = await (await ask("?abstract=T3", scripted([]))).json();
    const conferences = report.places.filter((p: { layout: string }) => p.layout.startsWith("conference"));
    expect(conferences.map((p: { layout: string; key: string; pool: string[]; shown: string[] }) => [p.layout, p.key, p.pool, p.shown])).toEqual([
      ["conference_outside", "P4", ["T5"], []],
      ["conference_inside", "P1", ["T1", "T2"], []],
      ["conference_inside", "P3", ["T4", "T7", "T8"], []],
    ]);
  });

  test("with no results yet, the matches carry no programme version", async () => {
    const report = await (await ask("?abstract=T3", scripted([]))).json();
    expect(report.matchesProgrammeVersion).toBeNull();
  });

  test("is 404 for an abstract the stored test set does not test, and with no test set stored", async () => {
    expect((await ask("?abstract=T2", scripted([]))).status).toBe(404);
    await db.execute(sql`delete from ams2027.test_set`);
    expect((await ask("?abstract=T1", scripted([]))).status).toBe(404);
  });

  test("is 400 without an abstract to report on", async () => {
    expect((await ask("", scripted([]))).status).toBe(400);
    expect((await ask("?abstract=../T1", scripted([]))).status).toBe(400);
  });

  test("while the matching API is still judging the talks of some places, there is no report yet: 202, saying how many", async () => {
    const asked: { talkId: string; talks: string[] }[] = [];
    const judgingT5 = scripted(asked, {
      verdicts: async (talkId, talks) => {
        asked.push({ talkId, talks });
        const judging: Judging[] = talks.includes("T5") ? [{ basedOn: talkId, restriction: TALKS }] : [];
        return { status: "ok", matches: [], judging };
      },
    });
    const res = await ask("?abstract=T1", judgingT5);
    expect(res.status).toBe(202);
    // T5 is in the related talks, conference P4, the day 28 January, its 9:00 AM time block and session S3.
    expect(await res.text()).toBe("The matching API is still judging 5 restrictions for this abstract; ask again shortly.");
    expect(asked).toHaveLength(11);
  });

  test("while the matching API is still judging a restriction behind what a place shows, there is no report yet", async () => {
    const judging: Judging[] = [
      { basedOn: "T1", restriction: { type: "day", id: "2026-01-27" } },
      { basedOn: "T1", restriction: { type: "timeBlock", id: "2026-01-27T13:45:00-06:00" } },
    ];
    const res = await ask("?abstract=T1", scripted([], { restricted: async () => ({ status: "ok", matches: [], judging }) }));
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("The matching API is still judging 2 restrictions for this abstract; ask again shortly.");
  });

  test("while the matching API is still judging anything for the abstract, even what no place shows, there is no report yet", async () => {
    const judging: Judging[] = [{ basedOn: "T1", restriction: { type: "session", id: "S9" } }];
    const res = await ask("?abstract=T1", scripted([], { restricted: async () => ({ status: "ok", matches: [], judging }) }));
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("The matching API is still judging 1 restriction for this abstract; ask again shortly.");
  });

  test("is 502 when the matching API cannot answer", async () => {
    expect((await ask("?abstract=T1", scripted([], { restricted: async () => ({ status: "unavailable" }) }))).status).toBe(502);
    expect((await ask("?abstract=T1", scripted([], { verdicts: async () => ({ status: "unavailable" }) }))).status).toBe(502);
  });
});
