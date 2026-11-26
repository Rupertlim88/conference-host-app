// Writes the tester's forms as JSON Schema files, one for each form, from the forms themselves.
//
//     npm run json-schema --workspace=@repo/host-contracts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { TESTER_FORMS } from "../tester";

const folder = join(import.meta.dirname, "..", "json-schema");
for (const [name, form] of Object.entries(TESTER_FORMS)) {
  writeFileSync(join(folder, `${name}.json`), `${JSON.stringify(z.toJSONSchema(form), null, 2)}\n`);
  console.log(`wrote ${name}.json`);
}
