import { authTables, type Db } from "@repo/host-store";
import { getAuthTables } from "better-auth/db";
import { getTableColumns } from "drizzle-orm";
import { expect, test } from "vitest";

import { authOptions } from "../src/auth";
import { readConfig } from "../src/config";

const config = readConfig({
  HOST_SOCIETY: "ams",
  HOST_DATABASE_URL: "postgres://localhost/unused",
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3001",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
});

// Better Auth reads and writes these columns by name. One it uses that the tables lack becomes a broken query
// only when someone signs in through Google, which no other test does.
test("the sign-in tables have every column Better Auth uses", () => {
  const tables: Record<string, (typeof authTables)[keyof typeof authTables] | undefined> = authTables;
  const missing = Object.entries(getAuthTables(authOptions(config, {} as Db))).flatMap(([model, { fields }]) => {
    const table = tables[model];
    if (!table) return [model];
    const columns = Object.keys(getTableColumns(table));
    return Object.keys(fields)
      .filter((field) => !columns.includes(field))
      .map((field) => `${model}.${field}`);
  });
  expect(missing).toEqual([]);
});
