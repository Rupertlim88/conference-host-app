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

const match = { basedOn: "T1", talk: "T2", match: true, shared: ["technique"], kind: "core", rank: 1, score: 0.9, description: "r", methods: [], programmeVersion: "pv_8f3k2Qw9xLm0ZpT4vN7aBc" };

const pooled = (talk: string, pool: object, rank = 1) => ({ ...match, talk, rank, pool });
const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA";

describe("conferenceApi.pooled", () => {
  test("sends matches:search with the key, the liked talk and the kinds of pool, in pages of a thousand", async () => {
    const found = pooled("T2", { type: "session", id: "S1" });
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ matches: [found] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    const got = await api.pooled("T1", ["day", "session"]);
    expect(got).toEqual({ status: "ok", matches: [found] });
    expect(seen).toEqual([
      {
        url: "/v1/conferences/ams-2026/matches:search",
        auth: `Bearer ${"k".repeat(16)}`,
        body: { likeTalks: ["T1"], pools: ["day", "session"], pageSize: 1000 },
      },
    ]);
  });

  test("reads every page, in order", async () => {
    const first = pooled("T2", { type: "day", id: "2027-01-12" });
    const second = pooled("T3", { type: "session", id: "S1" });
    const { url, seen } = await serve(() =>
      seen.length === 1
        ? { status: 200, body: JSON.stringify({ matches: [first], nextPageToken: TOKEN }) }
        : { status: 200, body: JSON.stringify({ matches: [second] }) },
    );
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.pooled("T1", ["day", "session"])).toEqual({ status: "ok", matches: [first, second] });
    expect(seen.map((s) => s.body)).toEqual([
      { likeTalks: ["T1"], pools: ["day", "session"], pageSize: 1000 },
      { likeTalks: ["T1"], pools: ["day", "session"], pageSize: 1000, pageToken: TOKEN },
    ]);
  });

  test("a page that fails makes the whole search unavailable", async () => {
    const { url, seen } = await serve(() =>
      seen.length === 1 ? { status: 200, body: JSON.stringify({ matches: [], nextPageToken: TOKEN }) } : { status: 500, body: "{}" },
    );
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.pooled("T1", ["conference"])).toEqual({ status: "unavailable" });
  });

  test("the time limit covers every page together", async () => {
    const { url, seen } = await serve(() => ({
      status: 200,
      body: JSON.stringify(seen.length < 3 ? { matches: [], nextPageToken: TOKEN } : { matches: [] }),
      delayMs: 60,
    }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026", timeoutMs: 100 });
    expect(await api.pooled("T1", ["conference"])).toEqual({ status: "unavailable" });
  });

  test("an error status, a bad answer or a slow answer is unavailable", async () => {
    for (const answer of [
      { status: 500, body: "{}" },
      { status: 200, body: "not json" },
      { status: 200, body: JSON.stringify({ matches: [{ talk: "T2" }] }) },
      { status: 200, body: JSON.stringify({ matches: [] }), delayMs: 300 },
    ]) {
      const { url } = await serve(() => answer);
      const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026", timeoutMs: 100 });
      expect(await api.pooled("T1", ["conference"])).toEqual({ status: "unavailable" });
      await new Promise<void>((r) => server!.close(() => r()));
      server = null;
    }
  });

  test("an unreachable API is unavailable", async () => {
    const api = conferenceApi({ url: "http://127.0.0.1:9", key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.pooled("T1", ["conference"])).toEqual({ status: "unavailable" });
  });
});

describe("conferenceApi.verdicts", () => {
  const judged = (talk: string, rank: number) => ({ ...match, talk, rank, match: false, shared: [], score: 0.1, description: "Nothing shared." });

  test("asks matches:search for every verdict on these talks, with no pools, and returns each as the API gave it", async () => {
    const answers = [judged("T2", 1), { ...match, talk: "T3", rank: 2 }];
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ matches: answers }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.verdicts("T1", ["T2", "T3", "T4"])).toEqual({ status: "ok", matches: answers });
    expect(seen.map((s) => s.body)).toEqual([{ likeTalks: ["T1"], talks: ["T2", "T3", "T4"], include: "all", pageSize: 1000 }]);
  });

  test("reads every page, in order", async () => {
    const { url, seen } = await serve(() =>
      seen.length === 1
        ? { status: 200, body: JSON.stringify({ matches: [judged("T2", 1)], nextPageToken: TOKEN }) }
        : { status: 200, body: JSON.stringify({ matches: [judged("T3", 2)] }) },
    );
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.verdicts("T1", ["T2", "T3"])).toEqual({ status: "ok", matches: [judged("T2", 1), judged("T3", 2)] });
    expect(seen[1]!.body).toEqual({ likeTalks: ["T1"], talks: ["T2", "T3"], include: "all", pageSize: 1000, pageToken: TOKEN });
  });

  test("asks about at most a thousand talks at a time, the contract's limit, and joins the answers", async () => {
    const talks = Array.from({ length: 2500 }, (_, i) => `T${i + 10}`);
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ matches: [judged(`T${seen.length}`, 1)] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    const got = await api.verdicts("T1", talks);
    expect(seen.map((s) => (s.body as { talks: string[] }).talks.length)).toEqual([1000, 1000, 500]);
    expect(seen.flatMap((s) => (s.body as { talks: string[] }).talks)).toEqual(talks);
    expect(got).toEqual({ status: "ok", matches: [judged("T1", 1), judged("T2", 1), judged("T3", 1)] });
  });

  test("with no talks to ask about, asks nothing", async () => {
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ matches: [] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.verdicts("T1", [])).toEqual({ status: "ok", matches: [] });
    expect(seen).toEqual([]);
  });

  test("a failed page, a bad answer or a slow search makes every verdict unavailable", async () => {
    for (const answer of [
      { status: 500, body: "{}" },
      { status: 200, body: JSON.stringify({ matches: [{ talk: "T2" }] }) },
      { status: 200, body: JSON.stringify({ matches: [] }), delayMs: 300 },
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
  test("asks matches:search for one talk and reports the status and whether the answer was valid", async () => {
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ matches: [match] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    const got = await api.check("T1");
    expect(got.outcome).toEqual({ kind: "answered", httpStatus: 200, validBody: true });
    expect(got.ms).toBeGreaterThanOrEqual(0);
    expect(seen[0]!.body).toEqual({ likeTalks: ["T1"], topPerPerson: 1 });
  });

  test("an error status or a bad answer is answered but not valid", async () => {
    for (const [status, body] of [[401, "{}"], [200, "not json"]] as const) {
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
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ matches: [] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2027" });
    expect(await api.pooled("-not-an-id", ["conference"])).toEqual({ status: "unavailable" });
    expect(seen).toEqual([]);
  });
});
