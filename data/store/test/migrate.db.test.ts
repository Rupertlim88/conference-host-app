import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { connect, type Db } from "../src/db";
import { migrateStore } from "../src/migrate";

const url = process.env.HOST_TEST_DATABASE_URL;

describe.skipIf(!url)("migrating a hosted database", { timeout: 60_000 }, () => {
  // vitest collects a skipped describe body too, so nothing here may assume a database.
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;

  beforeAll(async () => {
    for (const schema of ["ams2027", "sign_in", "auth"]) await db.execute(sql.raw(`drop schema if exists ${schema} cascade`));
    await db.execute(sql`drop table if exists drizzle.__host_store_migrations`);
    // Every Supabase project already has an auth schema of its own, for Supabase Auth.
    await db.execute(sql`create schema auth`);
    await db.execute(sql`create table auth.users (id uuid primary key)`);
  });
  afterAll(async () => {
    await db.execute(sql`drop schema if exists auth cascade`);
    await conn?.close();
  });

  test("works beside Supabase's own auth schema, and keeps sign-ins out of it", async () => {
    await migrateStore(db);
    const tables = async (schema: string) =>
      (
        await db.execute<{ table_name: string }>(
          sql`select table_name from information_schema.tables where table_schema = ${schema} order by table_name`,
        )
      ).map((r) => r.table_name);
    expect(await tables("sign_in")).toEqual(["account", "session", "user", "verification"]);
    expect(await tables("auth")).toEqual(["users"]);
  });

  test("leaves no schema for GSA, whose programme the host app no longer carries", async () => {
    await migrateStore(db);
    const schemas = (
      await db.execute<{ schema_name: string }>(sql`select schema_name from information_schema.schemata where schema_name = 'gsa2026'`)
    ).map((r) => r.schema_name);
    expect(schemas).toEqual([]);
  });
});
