// Migrations are applied by a command of their own, which loads nothing, so organisers' edits stay.
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import type { Db } from "./connect";

// A separate entry point (@repo/host-store/migrate): apps never import it, so bundlers never see the migrations folder.
/** Applies this package's migrations, tracked in their own table. Safe to run again. */
export async function migrateStore(db: Db): Promise<void> {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)),
    migrationsTable: "__host_store_migrations",
    migrationsSchema: "drizzle",
  });
}
