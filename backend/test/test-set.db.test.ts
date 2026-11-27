import type { TalksWriteRequest } from "@repo/contracts";
import {
  amsTables,
  connect,
  createDemoSettings,
  createProgramme,
  createSyncLog,
  createTestSets,
  createWholeProgramme,
  loadRows,
  type Db,
  type SocietyRows,
} from "@repo/host-store";
import { migrateStore } from "@repo/host-store/migrate";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { ApiRefusedError, type ConferenceApi } from "../src/matching-api";
import { takeTestSet } from "../src/test-set";
import { rows } from "./programme";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;

/** A conference API that takes every write, recording each request: the conference API itself runs elsewhere. */
function taking(sent: TalksWriteRequest[]): ConferenceApi {
  return {
    restricted: async () => ({ status: "unavailable" }),
    verdicts: async () => ({ status: "unavailable" }),
    check: async () => ({ outcome: { kind: "not-set" }, ms: 0 }),
    writeTalks: async (req) => {
      sent.push(req);
      return { programmeVersion: "pv_held", added: req.talks.length, changed: 0, withdrawn: 0, unchanged: 0, matchingJob: null };
    },
  };
}

// The test programme's S1 holds T1 and T2, with T3, which has no abstract, and the break BR.
const T3 = { ...rows.talks[0]!, id: "T3", number: "J7.3", abstract: "" };
const BR = { ...rows.talks[0]!, id: "BR", number: "", kind: "break" as const, abstract: "" };
const programme: SocietyRows = { ...rows, talks: [...rows.talks, T3, BR] };

describe.skipIf(!url)("a test set", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const store = createProgramme(db, "ams");
  const log = createSyncLog(db, "ams");
  const testSets = createTestSets(db, "ams");
  const whole = createWholeProgramme(db, "ams");
  const demo = createDemoSettings(db, "ams");
  const take = (body: unknown, api: ConferenceApi = taking([])) =>
    takeTestSet(new Request("http://localhost/api/test-set", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }), {
      conference: "ams-2027",
      whole,
      testSets,
      store,
      log,
      api,
    });
  // T2 moves to Wednesday at 9:00 in session S1, in P1; T1 is held but placed nowhere.
  const layout = {
    timeBlocks: [{ start: "2026-01-28T09:00", sessions: ["S1"] }],
    sessions: [{ id: "S1", start: "2026-01-28T09:00", talks: ["T2"] }],
    conferences: [{ trackId: "P1", title: "Education", talks: ["T2"] }],
  };
  const laidOut = { conference: "ams-2027", askers: ["T2"], talks: ["T1", "T2"], layout };
  const held = async () => (await store.talkSummaries(["T1", "T2", "T3", "BR"])).map((t) => t.id).sort();

  beforeEach(async () => {
    await migrateStore(db);
    await db.execute(sql`delete from ams2027.test_set`);
    await db.execute(sql`delete from ams2027.sync_runs`);
    await loadRows(db, amsTables, programme);
  });
  afterAll(async () => {
    await db?.execute(sql`delete from ams2027.test_set`);
    await loadRows(db, amsTables, rows);
    await conn?.close();
  });

  test("is stored and held, the first abstract is fixed, and the programme is sent: the answer gives the version", async () => {
    const sent: TalksWriteRequest[] = [];
    const res = await take({ conference: "ams-2027", askers: ["T2"], talks: ["T2", "T3"] }, taking(sent));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ sentProgrammeVersion: "pv_held" });
    expect(await held()).toEqual(["T2", "T3"]);
    expect((await demo.fixedAbstract())?.id).toBe("T2");
    expect(await testSets.latest()).toEqual({ conference: "ams-2027", askers: ["T2"], talks: ["T2", "T3"] });
    // The send carries the held talks it can match, as the organiser console's does: T3 has no abstract.
    expect(sent.flatMap((part) => part.talks.map((t) => t.id))).toEqual(["T2"]);
    expect((await log.runs())[0]).toMatchObject({ state: "sent", programmeVersion: "pv_held" });
  });

  test("with a layout, the send carries each talk where the layout places it, and a talk placed nowhere in no session", async () => {
    const sent: TalksWriteRequest[] = [];
    const res = await take(laidOut, taking(sent));
    expect(res.status).toBe(202);
    expect(await testSets.latest()).toEqual(laidOut);
    const talks = sent.flatMap((part) => part.talks);
    expect(talks.find((t) => t.id === "T2")).toMatchObject({ session: { id: "S1", start: "2026-01-28T09:00:00-06:00" }, tracks: ["P1"] });
    const t1 = talks.find((t) => t.id === "T1")!;
    expect([t1.session, t1.tracks]).toEqual([undefined, undefined]);
  });

  describe("is refused with 400 and a plain message, storing and sending nothing,", () => {
    const refusals: [string, unknown, RegExp][] = [
      ["when the body is not JSON", "{not json", /JSON/],
      ["when a list is empty", { conference: "ams-2027", askers: [], talks: ["T1"] }, /askers/],
      ["when it names another conference", { conference: "gsa-2026", askers: ["T1"], talks: ["T1"] }, /gsa-2026/],
      ["when it names a talk the published programme does not have", { conference: "ams-2027", askers: ["T1"], talks: ["T1", "T404"] }, /T404/],
      ["when it names a break, which is not a talk", { conference: "ams-2027", askers: ["T1"], talks: ["T1", "BR"] }, /BR/],
      ["when an abstract to test is not among its talks", { conference: "ams-2027", askers: ["T2"], talks: ["T1"] }, /T2/],
      ["when an abstract to test has no abstract to match", { conference: "ams-2027", askers: ["T3"], talks: ["T3"] }, /T3/],
      [
        "when its layout does not agree with itself",
        { ...laidOut, layout: { ...layout, timeBlocks: [{ start: "2026-01-28T09:00", sessions: ["S1", "S9"] }] } },
        /layout: a time block names a session the layout does not list: S9/,
      ],
      [
        "when its layout names a session AMS's published programme does not have",
        { ...laidOut, layout: { ...layout, timeBlocks: [{ start: "2026-01-28T09:00", sessions: ["S404"] }], sessions: [{ id: "S404", start: "2026-01-28T09:00", talks: ["T2"] }] } },
        /S404/,
      ],
      [
        "when its layout names a conference AMS's published programme does not have",
        { ...laidOut, layout: { ...layout, conferences: [{ trackId: "P404", title: "Nowhere", talks: ["T2"] }] } },
        /P404/,
      ],
    ];
    for (const [when, body, names] of refusals) {
      test(when, async () => {
        const sent: TalksWriteRequest[] = [];
        const res = await take(body, taking(sent));
        expect(res.status).toBe(400);
        expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
        expect(await res.text()).toMatch(names);
        expect(await testSets.latest()).toBeNull();
        expect(await held()).toEqual(["BR", "T1", "T2", "T3"]);
        expect(sent).toEqual([]);
      });
    }
  });

  test("while another send is running, is held but answers 409, and sends nothing", async () => {
    const sent: TalksWriteRequest[] = [];
    await log.start();
    const res = await take({ conference: "ams-2027", askers: ["T1"], talks: ["T1"] }, taking(sent));
    expect(res.status).toBe(409);
    expect(await res.text()).toMatch(/already running/);
    expect(sent).toEqual([]);
    expect(await held()).toEqual(["T1"]);
  });

  test("when the send fails, answers 502 with the send's reason", async () => {
    const refusing: ConferenceApi = {
      ...taking([]),
      writeTalks: async () => {
        throw new ApiRefusedError(401, "Unauthorized");
      },
    };
    const res = await take({ conference: "ams-2027", askers: ["T1"], talks: ["T1"] }, refusing);
    expect(res.status).toBe(502);
    expect(await res.text()).toMatch(/401 Unauthorized/);
  });

  test("before the whole programme is loaded, answers 503", async () => {
    await db.execute(sql`delete from ams2027.whole_talks`);
    const res = await take({ conference: "ams-2027", askers: ["T1"], talks: ["T1"] });
    expect(res.status).toBe(503);
    expect(await testSets.latest()).toBeNull();
  });
});
