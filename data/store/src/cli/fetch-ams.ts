import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { fetchAms } from "../fetch-ams";

// npm run fetch:ams --workspace=@repo/host-store: downloads the AMS 107th Annual Meeting's programme as published so
// far, its highlight lists and its pages of names, keeps only what the public programme shows, and writes it to
// data/programmes/ams2027. Nothing is written until every request has arrived. Run it again to refresh.
const OUT = fileURLToPath(new URL("../../../programmes/ams2027/", import.meta.url));

const { meeting, raw, kept, hashes } = await fetchAms();
mkdirSync(OUT, { recursive: true });
for (const [name, value] of Object.entries(kept)) {
  writeFileSync(`${OUT}${meeting}-${name}.json`, `${JSON.stringify(value)}\n`);
  const count = Array.isArray(value) ? `${value.length} rows kept` : "kept";
  const downloaded = name in raw ? `${raw[name as keyof typeof raw].length} rows downloaded, ` : "";
  console.log(`${name}: ${downloaded}${count}`);
}
for (const [path, hash] of Object.entries(hashes)) console.log(`${path}: unfiltered SHA-256 ${hash}`);
