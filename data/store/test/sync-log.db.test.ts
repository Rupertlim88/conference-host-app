import { SyncRunSchema } from "@repo/host-contracts";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { connect, type Db } from "../src/connect";
import { migrateStore } from "../src/migrate";
import { createSyncLog, STALE_AFTER_MINUTES } from "../src/sync-log";

const url = process.env.HOST_TEST_DATABASE_URL;
const counts = { sent: 3643, added: 1, changed: 2, withdrawn: 3, unchanged: 3637, programmeVersion: "pv_test" };

describe.skipIf(!url)("the send run log", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const ams = createSyncLog(db, "ams");
  const startedMinutesAgo = (id: number, minutes: number) =>
    db.execute(sql`update ams2027.sync_runs set started_at = now() - make_interval(mins => ${minutes}) where id = ${id}`);

  beforeAll(async () => {
    await migrateStore(db);
  });
  beforeEach(async () => {
    await db.execute(sql`delete from ams2027.sync_runs`);
  });
  afterAll(async () => {
    // CI loads the e2e programme into this same database, and a running row left here would refuse its first send.
    await db?.execute(sql`delete from ams2027.sync_runs`);
    await conn?.close();
  });

  test("a run starts with a fresh sync name, and no second run starts while it runs", async () => {
    const run = await ams.start();
    expect(run?.syncName).toMatch(/^send-[0-9a-f-]{36}$/);
    expect(await ams.start()).toBeNull();
    const [listed] = await ams.runs();
    expect(SyncRunSchema.parse(listed)).toMatchObject({ id: run!.id, state: "running", finishedAt: null });
  });

  test("of ten starts at the same moment, exactly one gets a run", async () => {
    const started = await Promise.all(Array.from({ length: 10 }, () => ams.start()));
    expect(started.filter((r) => r !== null)).toHaveLength(1);
    expect(await ams.runs()).toHaveLength(1);
  });

  test("a finished run records its counts, and the next run can start", async () => {
    const run = (await ams.start())!;
    const finished = await ams.finish(run.id, counts);
    expect(finished).toMatchObject({ state: "sent", ...counts, error: "" });
    expect(finished.finishedAt).not.toBeNull();
    expect(await ams.start()).not.toBeNull();
  });

  test("a failed run records why, and the next run can start", async () => {
    const run = (await ams.start())!;
    expect(await ams.fail(run.id, "401 Unauthorized")).toMatchObject({ state: "failed", error: "401 Unauthorized" });
    expect(await ams.start()).not.toBeNull();
  });

  test(`a run still running after ${STALE_AFTER_MINUTES} minutes is marked interrupted by the next start`, async () => {
    const old = (await ams.start())!;
    await startedMinutesAgo(old.id, STALE_AFTER_MINUTES - 1);
    expect(await ams.start()).toBeNull();
    await startedMinutesAgo(old.id, STALE_AFTER_MINUTES + 1);
    const next = await ams.start();
    expect(next).not.toBeNull();
    const [, first] = await ams.runs();
    expect(first).toMatchObject({ id: old.id, state: "interrupted", error: `No result after ${STALE_AFTER_MINUTES} minutes` });
  });

  test("a late finish leaves an interrupted run interrupted", async () => {
    const old = (await ams.start())!;
    await startedMinutesAgo(old.id, STALE_AFTER_MINUTES + 1);
    await ams.start();
    expect(await ams.finish(old.id, counts)).toMatchObject({ state: "interrupted", sent: 0 });
    expect(await ams.fail(old.id, "late")).toMatchObject({ state: "interrupted" });
  });

  test("lists the last ten runs, newest first", async () => {
    for (let i = 0; i < 12; i++) await ams.finish((await ams.start())!.id, counts);
    const runs = await ams.runs();
    expect(runs).toHaveLength(10);
    expect(runs.map((r) => r.id)).toEqual([...runs.map((r) => r.id)].sort((a, b) => b - a));
  });
});
