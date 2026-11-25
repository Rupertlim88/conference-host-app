import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { AMS_TYPES, fetchAms } from "../fetch-ams";

// npm run fetch:ams --workspace=@repo/host-store: downloads the AMS 107th Annual Meeting's programme as published so
// far, keeps only what the public programme shows, and writes it to data/programmes/ams2027. Nothing is written
// until all four types have arrived. Run it again to refresh.
const OUT = fileURLToPath(new URL("../../../programmes/ams2027/", import.meta.url));

const { meeting, raw, kept, hashes } = await fetchAms();
mkdirSync(OUT, { recursive: true });
for (const type of AMS_TYPES) {
  writeFileSync(`${OUT}${meeting}-${type}.json`, `${JSON.stringify(kept[type])}\n`);
  console.log(`${type}: ${raw[type].length} rows downloaded, ${kept[type].length} kept; unfiltered SHA-256 ${hashes[type]}`);
}
