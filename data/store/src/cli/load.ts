import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { AmsFilesSchema, amsRows } from "../ams-rows";
import { connect } from "../connect";
import { loadRows } from "../load";
import { migrateStore } from "../migrate";
import { SOCIETY_TABLES } from "../tables";

// npm run load --workspace=@repo/host-store -- ams: migrates the database, then loads AMS's programme as published.
const read = (file: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../programmes/ams2027/${file}`, import.meta.url)), "utf8"));

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

const rows = amsRows(
  AmsFilesSchema.parse({
    Paper: read("107ANNUAL-Paper.json"),
    Session: read("107ANNUAL-Session.json"),
    SlotData: read("107ANNUAL-SlotData.json"),
    Program: read("107ANNUAL-Program.json"),
  }),
);
const { db, close } = connect(url);
try {
  await migrateStore(db);
  const counts = await loadRows(db, SOCIETY_TABLES[society], rows);
  console.log(`${society}: ${counts.tracks} tracks, ${counts.sessions} sessions, ${counts.talks} talks, ${counts.people} people`);
} finally {
  await close();
}
