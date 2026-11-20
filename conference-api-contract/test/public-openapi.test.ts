import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { BUSINESS_LIMITS, type Method, OPERATIONS, PROTECTIONS, buildOpenApi } from "../src/public/openapi";

type Json = Record<string, unknown>;
const ROOT = join(import.meta.dirname, "..");
const spec = buildOpenApi() as Json;
const paths = spec.paths as Record<string, Record<string, Json>>;
const schemas = (spec.components as Json).schemas as Record<string, Json>;

const operations = () => Object.values(paths).flatMap((p) => Object.values(p));
const refName = (ref: unknown) => String(ref).replace("#/components/schemas/", "");

/** Every object schema reachable inside a schema, following component references. */
function objectsIn(schema: unknown, seen = new Set<string>()): Json[] {
  if (schema === null || typeof schema !== "object") return [];
  const node = schema as Json;
  if (typeof node.$ref === "string") {
    const name = refName(node.$ref);
    if (seen.has(name)) return [];
    seen.add(name);
    return objectsIn(schemas[name], seen);
  }
  const own = node.type === "object" ? [node] : [];
  return [...own, ...Object.values(node).flatMap((v) => objectsIn(v, seen))];
}

describe("the published specification", () => {
  test("the committed specification matches the zod source", () => {
    const committed = JSON.parse(readFileSync(join(ROOT, "openapi", "conference-api.v1.json"), "utf8"));
    expect(committed).toEqual(spec);
  });

  test("it is OpenAPI 3.1, and each path lists exactly the methods its operations use", () => {
    expect(spec.openapi).toBe("3.1.1");
    const expected: Record<string, string[]> = {};
    for (const op of Object.values(OPERATIONS)) (expected[op.path] ??= []).push(op.method.toLowerCase());
    expect(Object.fromEntries(Object.entries(paths).map(([path, methods]) => [path, Object.keys(methods).sort()]))).toEqual(
      Object.fromEntries(Object.entries(expected).map(([path, methods]) => [path, methods.sort()])),
    );
  });

  test("every operation states who may call it, what it acts on, and its daily quota", () => {
    for (const [name, op] of Object.entries(OPERATIONS)) {
      expect(["partner", "public"]).toContain(op.audience);
      expect(["conference", "account", "none"]).toContain(op.target);
      expect(op.limits.requestsPerDay, name).toBeGreaterThanOrEqual(op.limits.requestsPerMinute);
      const published = paths[op.path]![op.method.toLowerCase()]!;
      expect(published["x-audience"]).toBe(op.audience);
      expect((published["x-limits"] as Json).requestsPerDay).toBe(op.limits.requestsPerDay);
    }
  });

  test("every partner operation states which kinds of partner may call it", () => {
    for (const op of Object.values(OPERATIONS)) {
      const published = paths[op.path]![op.method.toLowerCase()]!;
      expect(published["x-partner-kinds"]).toEqual(op.partnerKinds);
      if ((op.audience as string) === "partner") expect(op.partnerKinds.length).toBeGreaterThan(0);
    }
  });

  test("a read sends no body, and every other operation states its body", () => {
    for (const op of Object.values(OPERATIONS)) {
      const published = paths[op.path]![op.method.toLowerCase()]!;
      if ((op.method as Method) === "GET") expect(published.requestBody).toBeUndefined();
      else expect(published.requestBody).toMatchObject({ required: true });
    }
  });

  test("every operation names the permission it needs, and only public ones need none", () => {
    for (const [operationId, op] of Object.entries(OPERATIONS)) {
      const published = operations().find((o) => o.operationId === operationId)!;
      expect(published["x-permission"]).toBe(op.permission);
      expect(op.permission === null).toBe((op.audience as string) === "public");
    }
    expect(OPERATIONS.writeTalks.permission).toBe("talks:write");
    expect(OPERATIONS.searchMatches.permission).toBe("matches:read");
  });

  test("every operation states its limits and timing", () => {
    for (const op of operations()) {
      const limits = op["x-limits"] as Json;
      expect(limits.maxBodyBytes).toBeGreaterThanOrEqual(op.requestBody === undefined ? 0 : 1);
      expect(limits.requestsPerMinute).toBeGreaterThan(0);
      expect(limits.timeoutSeconds).toBeGreaterThan(0);
    }
    expect(OPERATIONS.writeTalks.limits.maxBodyBytes).toBe(10_000_000);
  });

  test("every operation fits through the front door: API Gateway refuses bodies over 10 MB and stops waiting after 29 seconds", async () => {
    const { FRONT_DOOR } = await import("../src/public/index");
    expect(FRONT_DOOR).toEqual({ maxBodyBytes: 10_000_000, timeoutSeconds: 29 });
    for (const op of operations()) {
      const limits = op["x-limits"] as Json;
      expect(limits.maxBodyBytes).toBeLessThanOrEqual(FRONT_DOOR.maxBodyBytes);
      expect(limits.timeoutSeconds).toBeLessThan(FRONT_DOOR.timeoutSeconds);
    }
  });

  test("every name in a path is a declared, checked parameter, and nothing else is", () => {
    for (const op of operations()) {
      const path = Object.entries(paths).find(([, methods]) => Object.values(methods).includes(op))![0];
      const names = [...path.matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]);
      const params = (op.parameters ?? []) as Json[];
      const inPath = params.filter((p) => p.in === "path");
      expect(inPath.map((p) => p.name)).toEqual(names);
      for (const param of inPath) {
        expect(param).toMatchObject({ required: true });
        expect(typeof (param.schema as Json).pattern).toBe("string");
      }
      const others = params.filter((p) => p.in !== "path");
      expect(others.map((p) => p.name)).toEqual(op["x-signed"] === true ? ["Signature-Input", "Signature", "Content-Digest"] : []);
      for (const param of others) expect(param).toMatchObject({ in: "header", required: true });
    }
    const conference = (paths["/v1/conferences/{conference}/talks:write"]!.post!.parameters as Json[])[0]!;
    expect((conference.schema as Json).pattern).toBe("^[a-z0-9][a-z0-9-]{1,39}$");
  });

  test("every request object refuses unknown fields", () => {
    for (const op of operations()) {
      if (op.requestBody === undefined) continue;
      const content = (op.requestBody as Json).content as Json;
      expect(Object.keys(content)).toHaveLength(1);
      const body = Object.values(content)[0] as Json;
      const objects = objectsIn(body.schema);
      expect(objects.length).toBeGreaterThan(0);
      for (const o of objects) expect(o.additionalProperties).toBe(false);
    }
  });

  test("every refusal is a problem document", () => {
    for (const op of operations()) {
      const responses = op.responses as Record<string, Json>;
      const refusals = Object.keys(responses).filter((code) => Number(code) >= 400);
      expect(refusals).toEqual(expect.arrayContaining(["400", "401", "403", "404", "413", "415", "429", "500", "503"]));
      for (const code of refusals) {
        const content = responses[code]!.content as Json;
        expect(Object.keys(content)).toEqual(["application/problem+json"]);
        expect(refName((content["application/problem+json"] as Json).schema && ((content["application/problem+json"] as Json).schema as Json).$ref)).toBe("Problem");
      }
    }
  });

  test("author names and ORCID iDs are labelled personal data", () => {
    const talk = (((schemas.TalksWriteRequest!.properties as Json).talks as Json).items as Json).properties as Json;
    const author = ((talk.authors as Json).items as Json).properties as Json;
    expect((author.name as Json)["x-data-kind"]).toBe("pii");
    expect((author.orcid as Json)["x-data-kind"]).toBe("pii");
  });

  test("blank text is refused in the specification too", () => {
    const talk = (((schemas.TalksWriteRequest!.properties as Json).talks as Json).items as Json).properties as Json;
    expect(new RegExp(String((talk.title as Json).pattern)).test("   ")).toBe(false);
    expect(new RegExp(String((talk.title as Json).pattern)).test(" a ")).toBe(true);
  });
});

test("every operation states how many requests one partner may have running at once", () => {
  const spec = buildOpenApi() as { paths: Record<string, Record<string, { "x-limits": Record<string, number> }>> };
  for (const op of Object.values(OPERATIONS)) {
    expect(op.limits.concurrentRequests).toBeGreaterThanOrEqual(1);
    expect(spec.paths[op.path]![op.method.toLowerCase()]!["x-limits"].concurrentRequests).toBe(op.limits.concurrentRequests);
  }
});

test("the specification states the protections every request meets, before its operation's limits", () => {
  const spec = buildOpenApi() as { "x-protections": Record<string, number> };
  expect(spec["x-protections"]).toEqual(PROTECTIONS);
  for (const limit of Object.values(PROTECTIONS)) expect(limit).toBeGreaterThanOrEqual(1);
});

test("the specification states every business limit, per conference and per organiser", () => {
  const spec = buildOpenApi() as { "x-business-limits": Record<string, number> };
  expect(spec["x-business-limits"]).toEqual(BUSINESS_LIMITS);
  expect(BUSINESS_LIMITS).toEqual({
    talksPerConference: 50_000,
    keptTalkRevisionsPerConference: 2_000_000,
    programmeVersionsPerConference: 200_000,
    agreementsPerOrganiser: 1_000,
  });
});
