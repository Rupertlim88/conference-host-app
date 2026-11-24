import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { emitInternal } from "../src/internal/index";
import { buildOpenApi, endpointList } from "../src/public/openapi";
import { emitAll } from "../src/schemas";

/** Writes every generated form of the contract: the JSON Schemas, the OpenAPI specification and the endpoint list. */

const packageDir = join(import.meta.dirname, "..");

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function writeSchemas(dir: string, schemas: Record<string, unknown>): void {
  mkdirSync(dir, { recursive: true });
  for (const [kind, schema] of Object.entries(schemas)) writeJson(join(dir, `${kind}.schema.json`), schema);
}

function emit(): void {
  const schemas = emitAll();
  writeSchemas(join(packageDir, "schema"), schemas);
  writeSchemas(join(packageDir, "schema", "internal"), emitInternal());
  mkdirSync(join(packageDir, "openapi"), { recursive: true });
  writeJson(join(packageDir, "openapi", "conference-api.v1.json"), buildOpenApi());
  writeFileSync(join(packageDir, "endpoints.md"), endpointList());
  console.log(`emitted ${Object.keys(schemas).join(", ")} and openapi/conference-api.v1.json`);
}

const runDirectly = process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(import.meta.filename);
if (runDirectly) emit();
