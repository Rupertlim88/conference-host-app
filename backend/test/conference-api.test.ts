import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, test } from "vitest";

import { ApiRefusedError, conferenceApi } from "../src/conference-api";

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

const match = { talk: "T2", kind: "core", rank: 1, score: 0.9, reason: "r", sharedMethods: [], programmeVersion: "pv_8f3k2Qw9xLm0ZpT4vN7aBc" };

describe("conferenceApi.related", () => {
  test("sends matches:search with the key and the liked talk", async () => {
    const { url, seen } = await serve(() => ({ status: 200, body: JSON.stringify({ matches: [match] }) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "ams-2026" });
    const got = await api.related("T1", 5);
    expect(got).toEqual({ status: "ok", matches: [match] });
    expect(seen[0]).toEqual({
      url: "/v1/conferences/ams-2026/matches:search",
      auth: `Bearer ${"k".repeat(16)}`,
      body: { likeTalks: ["T1"], topPerPerson: 5 },
    });
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
      expect(await api.related("T1", 5)).toEqual({ status: "unavailable" });
      await new Promise<void>((r) => server!.close(() => r()));
      server = null;
    }
  });

  test("an unreachable API is unavailable", async () => {
    const api = conferenceApi({ url: "http://127.0.0.1:9", key: "k".repeat(16), conference: "ams-2026" });
    expect(await api.related("T1", 5)).toEqual({ status: "unavailable" });
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
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "gsa-2026" });
    const req = { talks: [{ id: "1", title: "One", abstract: "" }] };
    expect(await api.writeTalks(req)).toEqual(answer);
    expect(seen[0]!.url).toBe("/v1/conferences/gsa-2026/talks:write");
    expect(seen[0]!.body).toEqual(req);
  });

  test("a refused upload throws with the API's problem title", async () => {
    const problem = { type: "/problems/invalid-talks", title: "Some talks are invalid", status: 400, requestId: "req_9ToXrv3QWGspAajx6rMNfA" };
    const { url } = await serve(() => ({ status: 400, body: JSON.stringify(problem) }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "gsa-2026" });
    const refused = api.writeTalks({ talks: [{ id: "1", title: "One", abstract: "" }] });
    await expect(refused).rejects.toBeInstanceOf(ApiRefusedError);
    await expect(refused).rejects.toMatchObject({ status: 400, title: "Some talks are invalid" });
  });

  test("a refusal that is not JSON still carries its status", async () => {
    const { url } = await serve(() => ({ status: 502, body: "<html>Bad gateway</html>" }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "gsa-2026" });
    await expect(api.writeTalks({ talks: [{ id: "1", title: "One", abstract: "" }] })).rejects.toMatchObject({
      status: 502,
      title: "no problem details",
    });
  });

  test("a write stops as soon as the caller's signal aborts", async () => {
    const { url } = await serve(() => ({ status: 200, body: "{}", delayMs: 1500 }));
    const api = conferenceApi({ url, key: "k".repeat(16), conference: "gsa-2026" });
    const started = Date.now();
    await expect(
      api.writeTalks({ talks: [{ id: "1", title: "One", abstract: "" }] }, AbortSignal.timeout(50)),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
