import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { BUSINESS_LIMITS, OPERATIONS, PROTECTIONS, buildOpenApi } from "../src/public/openapi";

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

  test("every operation acts on one conference named in its path", () => {
    for (const [name, op] of Object.entries(OPERATIONS)) expect(op.path, name).toMatch(/^\/v1\/conferences\/\{conference\}\//);
  });

  test("every operation needs the API key for its conference, sent as a bearer token, and nothing else", () => {
    const schemes = (spec.components as Json).securitySchemes as Record<string, Json>;
    expect(Object.keys(schemes)).toEqual(["partnerKey"]);
    expect(schemes.partnerKey).toMatchObject({ type: "http", scheme: "bearer" });
    expect(spec.security).toEqual([{ partnerKey: [] }]);
    for (const op of operations()) expect(op.security).toEqual([{ partnerKey: [] }]);
  });

  test("it lists sending talks and the two requests that get matches, each a POST with a body, and nothing else", () => {
    expect(Object.fromEntries(Object.entries(paths).map(([path, methods]) => [path, Object.keys(methods)]))).toEqual({
      "/v1/conferences/{conference}/talks:write": ["post"],
      "/v1/conferences/{conference}/matches:search": ["post"],
      "/v1/conferences/{conference}/matches:fromText": ["post"],
    });
    for (const op of operations()) expect(op.requestBody).toMatchObject({ required: true });
  });

  test("every operation states its limits and timing: its body size, its requests per minute for each key, and its time limit", () => {
    for (const op of operations()) {
      const limits = op["x-limits"] as Json;
      expect(Object.keys(limits).sort()).toEqual(["maxBodyBytes", "requestsPerMinute", "timeoutSeconds"]);
      expect(limits.maxBodyBytes).toBeGreaterThanOrEqual(1);
      expect(limits.requestsPerMinute).toBeGreaterThan(0);
      expect(limits.timeoutSeconds).toBeGreaterThan(0);
    }
    expect(OPERATIONS.writeTalks.limits.maxBodyBytes).toBe(10_000_000);
  });

  test("every operation fits inside the front door's ceilings: bodies up to 10 MB, and answers within the load balancer's 29 seconds", async () => {
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
      expect(params.filter((p) => p.in !== "path")).toEqual([]);
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
      expect(refusals.sort()).toEqual(["400", "401", "404", "409", "413", "415", "429", "500", "503"]);
      for (const code of refusals) {
        const content = responses[code]!.content as Json;
        expect(Object.keys(content)).toEqual(["application/problem+json"]);
        expect(refName((content["application/problem+json"] as Json).schema && ((content["application/problem+json"] as Json).schema as Json).$ref)).toBe("Problem");
      }
    }
  });

  test("blank text is refused in the specification too", () => {
    const talk = (((schemas.TalksWriteRequest!.properties as Json).talks as Json).items as Json).properties as Json;
    expect(new RegExp(String((talk.title as Json).pattern)).test("   ")).toBe(false);
    expect(new RegExp(String((talk.title as Json).pattern)).test(" a ")).toBe(true);
  });
});

test("the specification states the firewall's limit on each network address, which every request meets first", () => {
  const spec = buildOpenApi() as { "x-protections": Record<string, number> };
  expect(PROTECTIONS).toEqual({ requestsPerFiveMinutesPerAddress: 3_000 });
  expect(spec["x-protections"]).toEqual(PROTECTIONS);
});

test("no field of any answer carries a label: every field the specification lists may leave the API", () => {
  expect(JSON.stringify(spec)).not.toMatch(/x-visibility|x-data-kind/);
});

test("the specification states every business limit, per conference and per organiser", () => {
  const spec = buildOpenApi() as { "x-business-limits": Record<string, number> };
  expect(spec["x-business-limits"]).toEqual(BUSINESS_LIMITS);
  expect(BUSINESS_LIMITS).toEqual({
    talksPerConference: 50_000,
    keptTalkRevisionsPerConference: 2_000_000,
    programmeVersionsPerConference: 200_000,
    newOrChangedTalksPerConferencePerDay: 5_000,
  });
});

test("a talks:write past the day's limit on new or changed talks is a 429 that applied nothing, to retry after Retry-After", () => {
  const spec = buildOpenApi() as { paths: Record<string, Record<string, { responses: Record<string, { description: string }> }>> };
  const tooMany = spec.paths[OPERATIONS.writeTalks.path]!.post!.responses["429"]!.description;
  expect(tooMany).toMatch(/day's limit on new or changed talks/);
  expect(tooMany).toMatch(/nothing was applied/);
  expect(tooMany).toMatch(/x-business-limits/);
  expect(tooMany).toMatch(/Retry after the time in Retry-After/);
});
