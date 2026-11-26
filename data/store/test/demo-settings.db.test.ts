import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { AmsFilesSchema, amsRows } from "../src/ams-rows";
import { connect, type Db } from "../src/connect";
import { createDemoSettings, DEFAULT_ABSTRACT } from "../src/demo-settings";
import { loadRows } from "../src/load";
import { migrateStore } from "../src/migrate";
import { amsTables } from "../src/tables";

const url = process.env.HOST_TEST_DATABASE_URL;
const fixture = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "ams-slice.json"), "utf8"));

describe.skipIf(!url)("the demo's fixed abstract", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const demo = createDemoSettings(db, "ams");

  beforeEach(async () => {
    await db.execute(sql`drop schema if exists ams2027 cascade`);
    await db.execute(sql`drop schema if exists gsa2026 cascade`);
    await db.execute(sql`drop schema if exists sign_in cascade`);
    await db.execute(sql`drop table if exists drizzle.__host_store_migrations`);
    await migrateStore(db);
    await loadRows(db, amsTables, amsRows(AmsFilesSchema.parse(fixture)));
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("with nothing set, the demo is fixed to its default abstract, a highly cited AMS keynote", async () => {
    expect(DEFAULT_ABSTRACT).toBe("498388");
    expect((await createDemoSettings(db, "ams", "477914").fixedAbstract())?.id).toBe("477914");
  });

  test("when the default abstract is not shown, the earliest talk with an abstract stands in", async () => {
    expect((await demo.fixedAbstract())?.id).toBe("464598");
  });

  test("a shown talk with an abstract becomes the fixed abstract, and stays after a reload", async () => {
    expect((await demo.setFixedAbstract("477914"))?.id).toBe("477914");
    expect((await demo.fixedAbstract())?.id).toBe("477914");
    await loadRows(db, amsTables, amsRows(AmsFilesSchema.parse(fixture)));
    expect((await demo.fixedAbstract())?.id).toBe("477914");
  });

  test("an unknown talk, a break and a withdrawn talk are refused, and the setting stays", async () => {
    await demo.setFixedAbstract("477914");
    await db.update(amsTables.talks).set({ withdrawn: true }).where(sql`${amsTables.talks.id} = '470089'`);
    for (const id of ["nope", "463533", "470089"]) expect(await demo.setFixedAbstract(id)).toBeNull();
    expect((await demo.fixedAbstract())?.id).toBe("477914");
  });

  test("a fixed abstract that is later withdrawn gives way to the earliest one", async () => {
    await demo.setFixedAbstract("477914");
    await db.update(amsTables.talks).set({ withdrawn: true }).where(sql`${amsTables.talks.id} = '477914'`);
    expect((await demo.fixedAbstract())?.id).toBe("464598");
  });
});
