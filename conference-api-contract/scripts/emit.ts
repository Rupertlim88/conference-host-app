import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { emitInternal } from "../src/internal/index";
import { buildOpenApi, endpointList } from "../src/public/openapi";
import { emitAll } from "../src/schemas";

const isMain =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(import.meta.filename);

if (isMain) {
  const dir = join(import.meta.dirname, "..", "schema");
  mkdirSync(dir, { recursive: true });
  for (const [kind, schema] of Object.entries(emitAll())) {
    writeFileSync(join(dir, `${kind}.schema.json`), JSON.stringify(schema, null, 2) + "\n");
  }
  const internalDir = join(dir, "internal");
  mkdirSync(internalDir, { recursive: true });
  for (const [kind, schema] of Object.entries(emitInternal())) {
    writeFileSync(join(internalDir, `${kind}.schema.json`), JSON.stringify(schema, null, 2) + "\n");
  }
  const openapiDir = join(import.meta.dirname, "..", "openapi");
  mkdirSync(openapiDir, { recursive: true });
  writeFileSync(join(openapiDir, "conference-api.v1.json"), JSON.stringify(buildOpenApi(), null, 2) + "\n");
  writeFileSync(join(import.meta.dirname, "..", "endpoints.md"), endpointList());
  console.log(`emitted ${Object.keys(emitAll()).join(", ")} and openapi/conference-api.v1.json`);
}
