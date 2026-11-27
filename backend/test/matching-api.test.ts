import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, test } from "vitest";

import { ApiRefusedError, conferenceApi, connectionStatus, RequestNotSent } from "../src/matching-api";

interface Seen {
  url: string;
  auth: string | undefined;
  body: unknown;
}
let server: Server | null = null;

async function serve(answer: (req: IncomingMessage) => { status: number; body: string; delayMs?: number }) {
  const seen: Seen[] = [];
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    seen.push({ url: req.url ?? "", auth: req.headers.authorization, body: raw ? JSON.parse(raw) : null });
    const a = answer(req);
    setTimeout(() => {
      res.writeHead(a.status, { "content-type": "application/json" });
      res.end(a.body);
    }, a.delayMs ?? 0);
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, seen };
}

afterEach(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  server = null;
});

const VERSION = "pv_8f3k2Qw9xLm0ZpT4vN7aBc";
const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA";

/** A connection from T1, the main talk, to another talk, as the API lists it: every pair in the order of its talks. */
const connection = (other: string, restriction: object, rank = 1, main = "T1") => ({
  talks: [main, other],
  titles: [`Talk ${main}`, `Talk ${other}`],
  restriction,
  rank,
  score: 0.9,
  kind: "core",
  shared: ["technique"],
  descriptions: [`Why ${other} matters to ${main}.`, `Why ${main} matters to ${other}.`],
  methods: [[{ intent: `${main}'s aim`, technique: `${main}'s way` }, { intent: `${other}'s aim`, technique: `${other}'s way` }]],
  programmeVersion: VERSION,
});
type Listed = ReturnType<typeof connection>;
/** One page of the API's answer: an entry for each main talk its connections name, in order. */
const page = (connections: Listed[], rest: object = {}) => {
  const entries = new Map<string, { talk: string; title: string; connections: Listed[] }>();
  for (const c of connections) {
    const entry = entries.get(c.talks[0]!) ?? { talk: c.talks[0]!, title: c.titles[0]!, connections: [] };
    entry.connections.push(c);
    entries.set(entry.talk, entry);
  }
  return JSON.stringify({ abstracts: [...entries.values()], ...rest });
};
/** A connection as the host app uses it: the other talk, and the main talk's description of it. */
const asMatch = (c: Listed) => ({ talk: c.talks[1], restriction: c.restriction, kind: c.kind, score: c.score, description: c.descriptions[0] });
const judging = (restriction: object) => ({ basedOn: "T1", restriction });

describe("conferenceApi.restricted", () => {
  test("sends matches:search with the key, the liked talk, each kind of restriction, every one of it, and how many to list in each, in pages of a thousand", async () => {
    const found = connection("T2", { type: "session", id: "S1" });
    const stillJudged = judging({ type: "day", id: "2027-01-12" });
    const { url, seen } = await serve(() => ({ status: 200, body: page([found], { judging: [stillJudged] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.restricted("T1", ["day", "session"], 4)).toEqual({ status: "ok", matches: [asMatch(found)], judging: [stillJudged] });
    expect(seen).toEqual([
      {
        url: "/v1/conferences/ams-2026/matches:search",
        auth: `Bearer ${"k".repeat(16)}`,
        body: { likeTalks: ["T1"], restrictions: [{ type: "day" }, { type: "session" }], top: 4, pageSize: 1000 },
      },
    ]);
  });

  test("each match is the other talk of a connection, with the main talk's side of its description", async () => {
    const found = connection("T2", { type: "conference" });
    const { url } = await serve(() => ({ status: 200, body: page([found]) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.restricted("T1", ["conference"], 6)).toEqual({
      status: "ok",
      matches: [{ talk: "T2", restriction: { type: "conference" }, kind: "core", score: 0.9, description: "Why T2 matters to T1." }],
      judging: [],
    });
  });

  test("reads every page, joins the talk's entry where it continues on the next page, in order, and keeps each restriction still being judged once", async () => {
    const first = connection("T2", { type: "day", id: "2027-01-12" });
    const second = connection("T3", { type: "day", id: "2027-01-12" }, 2);
    const third = connection("T3", { type: "session", id: "S1" });
    const stillJudged = judging({ type: "timeBlock", id: "2027-01-12T08:30:00-07:00" });
    const { url, seen } = await serve(() =>
      seen.length === 1
        ? { status: 200, body: page([first, second], { judging: [stillJudged], nextPageToken: TOKEN }) }
        : { status: 200, body: page([third], { judging: [stillJudged] }) },
    );
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    const asked = [{ type: "conference" }, { type: "session" }];
    expect(await api.restricted("T1", ["conference", "session"], 4)).toEqual({
      status: "ok",
      matches: [first, second, third].map(asMatch),
      judging: [stillJudged],
    });
    expect(seen.map((s) => s.body)).toEqual([
      { likeTalks: ["T1"], restrictions: asked, top: 4, pageSize: 1000 },
      { likeTalks: ["T1"], restrictions: asked, top: 4, pageSize: 1000, pageToken: TOKEN },
    ]);
  });

  test("keeps only the connections of the talk it asked about", async () => {
    const own = connection("T2", { type: "conference" });
    const { url } = await serve(() => ({ status: 200, body: page([connection("T3", { type: "conference" }, 1, "T9"), own]) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.restricted("T1", ["conference"], 6)).toEqual({ status: "ok", matches: [asMatch(own)], judging: [] });
  });

  test("an answer that lists nothing and judges nothing has no matches and nothing being judged", async () => {
    const { url } = await serve(() => ({ status: 200, body: JSON.stringify({ abstracts: [] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.restricted("T1", ["conference"], 6)).toEqual({ status: "ok", matches: [], judging: [] });
  });

  test("a page that fails makes the whole search unavailable", async () => {
    const { url, seen } = await serve(() =>
      seen.length === 1 ? { status: 200, body: page([], { nextPageToken: TOKEN }) } : { status: 500, body: "{}" },
    );
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.restricted("T1", ["conference"], 6)).toEqual({ status: "unavailable" });
  });

  test("the time limit covers every page together", async () => {
    const { url, seen } = await serve(() => ({
      status: 200,
      body: seen.length < 3 ? page([], { nextPageToken: TOKEN }) : page([]),
      delayMs: 60,
    }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026", timeoutMs: 100 });
    expect(await api.restricted("T1", ["conference"], 6)).toEqual({ status: "unavailable" });
  });

  test("an error status, a bad answer, the old form of answer or a slow answer is unavailable", async () => {
    for (const answer of [
      { status: 500, body: "{}" },
      { status: 200, body: "not json" },
      { status: 200, body: JSON.stringify({ abstracts: [{ talk: "T1" }] }) },
      { status: 200, body: JSON.stringify({ abstracts: [], judging: [{ basedOn: "T1" }] }) },
      { status: 200, body: JSON.stringify({ matches: [] }) },
      { status: 200, body: page([]), delayMs: 300 },
    ]) {
      const { url } = await serve(() => answer);
      const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026", timeoutMs: 100 });
      expect(await api.restricted("T1", ["conference"], 6)).toEqual({ status: "unavailable" });
      await new Promise<void>((r) => server!.close(() => r()));
      server = null;
    }
  });

  test("an unreachable API is unavailable", async () => {
    const api = conferenceApi({ url: "http://127.0.0.1:9", key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.restricted("T1", ["conference"], 6)).toEqual({ status: "unavailable" });
  });
});

describe("conferenceApi.verdicts", () => {
  const judged = (talk: string, rank: number) => connection(talk, { type: "talks" }, rank);
  const talksAsked = (s: Seen) => (s.body as { restrictions: { ids: string[] }[] }).restrictions[0]!.ids;

  test("asks matches:search for every match among these talks, as the talks restriction, and returns each connection as the API gave it", async () => {
    const answers = [judged("T2", 1), judged("T3", 2)];
    const { url, seen } = await serve(() => ({ status: 200, body: page(answers) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.verdicts("T1", ["T2", "T3", "T4"])).toEqual({ status: "ok", connections: answers, judging: [] });
    expect(seen.map((s) => s.body)).toEqual([
      { likeTalks: ["T1"], restrictions: [{ type: "talks", ids: ["T2", "T3", "T4"] }], top: 3, pageSize: 1000 },
    ]);
  });

  test("says when the talks are still being judged", async () => {
    const stillJudged = judging({ type: "talks" });
    const { url } = await serve(() => ({ status: 200, body: page([], { judging: [stillJudged] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.verdicts("T1", ["T2"])).toEqual({ status: "ok", connections: [], judging: [stillJudged] });
  });

  test("reads every page, in order", async () => {
    const { url, seen } = await serve(() =>
      seen.length === 1 ? { status: 200, body: page([judged("T2", 1)], { nextPageToken: TOKEN }) } : { status: 200, body: page([judged("T3", 2)]) },
    );
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.verdicts("T1", ["T2", "T3"])).toEqual({ status: "ok", connections: [judged("T2", 1), judged("T3", 2)], judging: [] });
    expect(seen[1]!.body).toEqual({ likeTalks: ["T1"], restrictions: [{ type: "talks", ids: ["T2", "T3"] }], top: 2, pageSize: 1000, pageToken: TOKEN });
  });

  test("asks about at most a thousand talks at a time, the contract's limit, for every match among them, and joins the answers", async () => {
    const talks = Array.from({ length: 2500 }, (_, i) => `T${i + 10}`);
    const { url, seen } = await serve(() => ({ status: 200, body: page([judged(`T${seen.length + 1}`, 1)]) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    const got = await api.verdicts("T1", talks);
    expect(seen.map((s) => talksAsked(s).length)).toEqual([1000, 1000, 500]);
    expect(seen.map((s) => (s.body as { top: number }).top)).toEqual([1000, 1000, 500]);
    expect(seen.flatMap(talksAsked)).toEqual(talks);
    expect(got).toEqual({ status: "ok", connections: [judged("T2", 1), judged("T3", 1), judged("T4", 1)], judging: [] });
  });

  test("with no talks to ask about, asks nothing", async () => {
    const { url, seen } = await serve(() => ({ status: 200, body: page([]) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.verdicts("T1", [])).toEqual({ status: "ok", connections: [], judging: [] });
    expect(seen).toEqual([]);
  });

  test("a failed page, a bad answer or a slow search makes every verdict unavailable", async () => {
    const sharesNothing = { ...judged("T2", 1), shared: [] };
    for (const answer of [
      { status: 500, body: "{}" },
      { status: 200, body: JSON.stringify({ abstracts: [{ talk: "T2" }] }) },
      // Every connection is a real match: it shares the intent, the technique or both.
      { status: 200, body: page([sharesNothing]) },
      { status: 200, body: page([]), delayMs: 300 },
    ]) {
      const { url } = await serve(() => answer);
      const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026", timeoutMs: 100 });
      expect(await api.verdicts("T1", ["T2"])).toEqual({ status: "unavailable" });
      await new Promise<void>((r) => server!.close(() => r()));
      server = null;
    }
  });
});

describe("conferenceApi.check", () => {
  test("asks matches:search for one match of one talk and reports the status and whether the answer was valid", async () => {
    const { url, seen } = await serve(() => ({ status: 200, body: page([connection("T2", { type: "conference" })]) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    const got = await api.check("T1");
    expect(got.outcome).toEqual({ kind: "answered", httpStatus: 200, validBody: true });
    expect(got.ms).toBeGreaterThanOrEqual(0);
    expect(seen[0]!.body).toEqual({ likeTalks: ["T1"], top: 1 });
  });

  test("an answer that the talk is still being judged is valid", async () => {
    const { url } = await serve(() => ({ status: 200, body: page([], { judging: [judging({ type: "conference" })] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect((await api.check("T1")).outcome).toEqual({ kind: "answered", httpStatus: 200, validBody: true });
  });

  test("an error status, a bad answer or the old form of answer is answered but not valid", async () => {
    for (const [status, body] of [[401, "{}"], [200, "not json"], [200, JSON.stringify({ matches: [] })]] as const) {
      const { url } = await serve(() => ({ status, body }));
      const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
      expect((await api.check("T1")).outcome).toEqual({ kind: "answered", httpStatus: status, validBody: false });
      await new Promise<void>((r) => server!.close(() => r()));
      server = null;
    }
  });

  test("a slow or unreachable API is unreachable", async () => {
    const { url } = await serve(() => ({ status: 200, body: "{}", delayMs: 300 }));
    const slow = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026", timeoutMs: 50 });
    expect((await slow.check("T1")).outcome).toEqual({ kind: "unreachable" });
    const gone = conferenceApi({ url: "http://127.0.0.1:9", key: "k".repeat(16), conference: "ams-2026" });
    expect((await gone.check("T1")).outcome).toEqual({ kind: "unreachable" });
  });
});

describe("conferenceApi.writeTalks", () => {
  test("sends talks:write and returns the parsed answer", async () => {
    const answer = { programmeVersion: "pv_8f3k2Qw9xLm0ZpT4vN7aBc", added: 1, changed: 0, withdrawn: 0, unchanged: 0, matchingJob: "job_x91Kd02LmQpZ7rT5vWb3Yu" };
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify(answer) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2027" });
    const req = { talks: [{ id: "1", title: "One", abstract: "An abstract." }] };
    expect(await api.writeTalks(req)).toEqual(answer);
    expect(seen[0]!.url).toBe("/v1/conferences/ams-2027/talks:write");
    expect(seen[0]!.body).toEqual(req);
  });

  test("a refused upload throws with the API's problem title", async () => {
    const problem = { type: "/problems/invalid-talks", title: "Some talks are invalid", status: 400, requestId: "req_9ToXrv3QWGspAajx6rMNfA" };
    const { url } = await serve(() => ({ status: 400, body: JSON.stringify(problem) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2027" });
    const refused = api.writeTalks({ talks: [{ id: "1", title: "One", abstract: "An abstract." }] });
    await expect(refused).rejects.toBeInstanceOf(ApiRefusedError);
    await expect(refused).rejects.toMatchObject({ status: 400, title: "Some talks are invalid" });
  });

  test("a refusal that is not JSON still carries its status", async () => {
    const { url } = await serve(() => ({ status: 502, body: "<html>Bad gateway</html>" }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2027" });
    await expect(api.writeTalks({ talks: [{ id: "1", title: "One", abstract: "An abstract." }] })).rejects.toMatchObject({
      status: 502,
      title: "no problem details",
    });
  });

  test("a write stops as soon as the caller's signal aborts", async () => {
    const { url } = await serve(() => ({ status: 200, body: "{}", delayMs: 1500 }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2027" });
    const started = Date.now();
    await expect(
      api.writeTalks({ talks: [{ id: "1", title: "One", abstract: "An abstract." }] }, AbortSignal.timeout(50)),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe("connectionStatus", () => {
  test("names what a connection test found", () => {
    expect(connectionStatus({ kind: "not-set" })).toBe("not-set");
    expect(connectionStatus({ kind: "unreachable" })).toBe("unreachable");
    expect(connectionStatus({ kind: "answered", httpStatus: 200, validBody: true })).toBe("ok");
    expect(connectionStatus({ kind: "answered", httpStatus: 200, validBody: false })).toBe("unexpected-answer");
    expect(connectionStatus({ kind: "answered", httpStatus: 401, validBody: false })).toBe("refused-key");
    expect(connectionStatus({ kind: "answered", httpStatus: 403, validBody: false })).toBe("refused-key");
    expect(connectionStatus({ kind: "answered", httpStatus: 404, validBody: false })).toBe("no-programme");
    expect(connectionStatus({ kind: "answered", httpStatus: 500, validBody: false })).toBe("unexpected-answer");
  });
});

describe("requests are checked against the conference API's contract before they are sent", () => {
  test("a write that breaks the contract is never sent, and says what was wrong", async () => {
    const { url, seen } = await serve(() => ({ status: 200, body: "{}" }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2027" });
    const twice = { id: "1", title: "One", abstract: "An abstract." };
    const refused = api.writeTalks({ talks: [twice, twice] });
    await expect(refused).rejects.toBeInstanceOf(RequestNotSent);
    await expect(refused).rejects.toThrow(/sent twice/);
    expect(seen).toEqual([]);
  });

  test("a matches search that breaks the contract is never sent, and its matches are unavailable", async () => {
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ abstracts: [] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2027" });
    expect(await api.restricted("-not-an-id", ["conference"], 6)).toEqual({ status: "unavailable" });
    expect(seen).toEqual([]);
  });
});
