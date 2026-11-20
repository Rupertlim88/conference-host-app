import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { AMS_TYPES, publicProgramme, type AmsFiles } from "./ams-public";

// npm run fetch:ams --workspace=@repo/host-store: downloads the AMS 107th Annual Meeting's programme as published so
// far, keeps only what the public programme shows, and writes data/ams2027. Run it again to refresh.
// One request per type, two seconds apart (data/CLAUDE.md rule 4). The unfiltered downloads stay in memory,
// and nothing is written until all four have arrived.
const MEETING = "107ANNUAL";
const SOURCE = `https://ams.confex.com/ams/${MEETING}/meetingapi.cgi`;
const OUT = fileURLToPath(new URL("../../ams2027/", import.meta.url));

const raw = {} as AmsFiles;
const hashes: Record<string, string> = {};
for (const [i, type] of AMS_TYPES.entries()) {
  if (i > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
  const res = await fetch(`${SOURCE}/${type}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${SOURCE}/${type} answered ${res.status}`);
  const text = await res.text();
  const body: unknown = JSON.parse(text);
  const rows = Array.isArray(body) ? body : (body as { data?: unknown }).data;
  if (!Array.isArray(rows)) throw new Error(`${SOURCE}/${type} did not return a list`);
  raw[type] = rows as Record<string, unknown>[];
  hashes[type] = createHash("sha256").update(text).digest("hex");
}

// The lists are filtered together: a paper in a left-out session goes with it, and slots follow their entries.
const kept = publicProgramme(raw);
mkdirSync(OUT, { recursive: true });
for (const type of AMS_TYPES) {
  writeFileSync(`${OUT}${MEETING}-${type}.json`, `${JSON.stringify(kept[type])}\n`);
  console.log(`${type}: ${raw[type].length} rows downloaded, ${kept[type].length} kept; unfiltered SHA-256 ${hashes[type]}`);
}
