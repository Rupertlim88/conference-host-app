import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { AmsFilesSchema, amsRows } from "./ams";
import { connect } from "./db";
import { migrateStore } from "./migrate";
import { loadRows } from "./load-rows";
import type { SocietyRows } from "./rows";
import { SOCIETY_TABLES, type Society } from "./schema";

const read = (dir: string, file: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../${dir}/${file}`, import.meta.url)), "utf8"));

const READERS: Record<Society, () => SocietyRows> = {
  ams: () =>
    amsRows(
      AmsFilesSchema.parse({
        Paper: read("ams2027", "107ANNUAL-Paper.json"),
        Session: read("ams2027", "107ANNUAL-Session.json"),
        SlotData: read("ams2027", "107ANNUAL-SlotData.json"),
        Program: read("ams2027", "107ANNUAL-Program.json"),
      }),
    ),
};

const society = process.argv[2];
const url = process.env.HOST_DATABASE_URL;
if (society !== "ams") {
  console.error("Usage: npm run load --workspace=@repo/host-store -- ams");
  process.exit(1);
}
if (!url) {
  console.error("Set HOST_DATABASE_URL to the host app's Postgres.");
  process.exit(1);
}

const rows = READERS[society]();
const { db, close } = connect(url);
try {
  await migrateStore(db);
  const counts = await loadRows(db, SOCIETY_TABLES[society], rows);
  console.log(`${society}: ${counts.tracks} tracks, ${counts.sessions} sessions, ${counts.talks} talks, ${counts.people} people`);
} finally {
  await close();
}
