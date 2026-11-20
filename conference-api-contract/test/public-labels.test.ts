import { describe, expect, test } from "vitest";

import { DATA_KINDS, buildOpenApi } from "../src/public/index";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const spec = buildOpenApi() as Json;
const KINDS = Object.keys(DATA_KINDS);

/** Every field of a schema, with its path, through nested objects, list items and alternatives. */
function fieldsOf(schema: Json, path: string, out: [string, Json][] = []): [string, Json][] {
  for (const [name, field] of Object.entries((schema.properties ?? {}) as Record<string, Json>)) {
    out.push([`${path}.${name}`, field]);
    fieldsOf(field, `${path}.${name}`, out);
  }
  if (schema.items) fieldsOf(schema.items, `${path}[]`, out);
  for (const branch of (schema.anyOf ?? []) as Json[]) fieldsOf(branch, path, out);
  return out;
}

const schemas = spec.components.schemas as Record<string, Json>;
const responses = new Set(
  Object.values(spec.paths as Record<string, Record<string, Json>>).flatMap((methods) =>
    Object.values(methods).flatMap((op) => Object.values(op.responses["200"].content as Record<string, Json>).map((c) => String(c.schema.$ref).split("/").pop())),
  ),
);

describe("every field is labelled", () => {
  test("with the kind of data it holds, in every request and response", () => {
    const unlabelled = Object.entries(schemas)
      .flatMap(([name, schema]) => fieldsOf(schema, name))
      .filter(([, field]) => !KINDS.includes(field["x-data-kind"]))
      .map(([path]) => path);
    expect(unlabelled).toEqual([]);
  });

  test("a response that is not an object is labelled as a whole", () => {
    for (const [name, schema] of Object.entries(schemas)) {
      if (schema.type !== "object" && schema.anyOf === undefined) expect(KINDS, name).toContain(schema["x-data-kind"]);
    }
  });

  test("with who may see it, in every response", () => {
    const unlabelled = [...responses]
      .flatMap((name) => fieldsOf(schemas[name!]!, name!))
      .filter(([, field]) => !["public", "internal"].includes(field["x-visibility"]))
      .map(([path]) => path);
    expect(unlabelled).toEqual([]);
  });

  test("path parameters and signature headers too", () => {
    for (const methods of Object.values(spec.paths as Record<string, Record<string, Json>>)) {
      for (const op of Object.values(methods)) {
        for (const param of (op.parameters ?? []) as Json[]) expect(KINDS, param.name).toContain(param["x-data-kind"]);
      }
    }
  });

  test("whatever is about a person is personal data", () => {
    const kindAt = (schema: string, path: string) => fieldsOf(schemas[schema]!, schema).find(([p]) => p === `${schema}.${path}`)?.[1]["x-data-kind"];
    expect(kindAt("TalksWriteRequest", "talks[].authors[].id")).toBe("pii");
    expect(kindAt("TalksWriteRequest", "talks[].authors[].name")).toBe("pii");
    expect(kindAt("TalksWriteRequest", "talks[].authors[].orcid")).toBe("pii");
    expect(kindAt("TalksWriteRequest", "talks[].presenters")).toBe("pii");
    expect(kindAt("MatchesSearchRequest", "people")).toBe("pii");
    expect(kindAt("MatchesSearchResponse", "matches[].person")).toBe("pii");
    expect(kindAt("AttendanceReportRequest", "attendees[].attended")).toBe("pii");
    expect(kindAt("IssuedCredential", "jwt")).toBe("pii");
    expect(kindAt("VerifyCredentialRequest", "credential")).toBe("pii");
    const person = (spec.paths["/v1/conferences/{conference}/people/{person}:erase"].post.parameters as Json[]).find((p) => p.name === "person");
    expect(person!["x-data-kind"]).toBe("pii");
  });

  test("each kind of data has a protection level, which the specification states", () => {
    expect(spec["x-data-kinds"]).toEqual(DATA_KINDS);
    for (const kind of Object.values(DATA_KINDS)) expect(["high", "moderate", "standard"]).toContain(kind.protection);
  });
});

describe("what each operation reaches", () => {
  test("an operation reaches personal data when its request or answer holds a field labelled pii", async () => {
    const { dataKindsOf } = await import("../src/public/index");
    expect(dataKindsOf("reportAttendance")).toContain("pii");
    expect(dataKindsOf("searchMatches")).toContain("pii");
    expect(dataKindsOf("getMatchSettings")).not.toContain("pii");
    expect(dataKindsOf("getIssuerKeys")).not.toContain("pii");
  });
});
