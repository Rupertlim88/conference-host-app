import { connect } from "./db";
import { migrateStore } from "./migrate";

// npm run migrate --workspace=@repo/host-store: applies new migrations and loads nothing, so organiser edits,
// stars, notes and sign-ins stay. A first setup uses `npm run load`, which migrates too.
const url = process.env.HOST_DATABASE_URL;
if (!url) {
  console.error("Set HOST_DATABASE_URL to the host app's Postgres.");
  process.exit(1);
}
const { db, close } = connect(url);
try {
  await migrateStore(db);
  console.log("The host store's migrations are applied.");
} finally {
  await close();
}
