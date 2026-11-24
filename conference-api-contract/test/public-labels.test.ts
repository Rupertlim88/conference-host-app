import { describe, expect, test } from "vitest";

import { buildOpenApi } from "../src/public/index";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const spec = buildOpenApi() as Json;

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

describe("the labels on fields", () => {
  test("every field of every response is marked public or internal", () => {
    const unlabelled = [...responses]
      .flatMap((name) => fieldsOf(schemas[name!]!, name!))
      .filter(([, field]) => !["public", "internal"].includes(field["x-visibility"]))
      .map(([path]) => path);
    expect(unlabelled).toEqual([]);
  });

  test("that is the only label: no field is labelled with a kind of data", () => {
    expect(JSON.stringify(spec)).not.toMatch(/x-data-kind/);
  });
});
