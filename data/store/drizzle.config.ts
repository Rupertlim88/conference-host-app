import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/tables.ts",
  out: "./src/migrations",
  // Own tracking table, so these migrations never mix with another package's in a shared database.
  migrations: { table: "__host_store_migrations", schema: "drizzle" },
  dbCredentials: {
    get url(): string {
      const url = process.env.HOST_DATABASE_URL;
      if (!url) throw new Error("HOST_DATABASE_URL is not set");
      return url;
    },
  },
});
