import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { amsTables, connect, createSyncLog, loadRows, type Db } from "@repo/host-store";
import { migrateStore } from "@repo/host-store/migrate";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { rows } from "./programme";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;
const run = promisify(execFile);
const backend = fileURLToPath(new URL("..", import.meta.url));

/** Runs `npm run sync` as a person would, with these settings and no conference API. */
async function sync(): Promise<{ code: number; stderr: string }> {
  const env = {
    // eslint-disable-next-line turbo/no-undeclared-env-vars -- the command needs a PATH to find npx
    PATH: process.env.PATH,
    HOST_SOCIETY: "ams",
    HOST_DATABASE_URL: url,
    BETTER_AUTH_SECRET: "s".repeat(32),
    BETTER_AUTH_URL: "http://localhost:3001",
  };
  try {
    await run("npx", ["tsx", "src/cli/sync.ts"], { cwd: backend, env });
    return { code: 0, stderr: "" };
  } catch (error) {
    const failed = error as { code: number; stderr: string };
    return { code: failed.code, stderr: failed.stderr };
  }
}

describe.skipIf(!url)("the sync command", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const log = createSyncLog(db, "ams");

  beforeAll(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, rows);
  });
  beforeEach(async () => {
    await db.execute(sql`delete from ams2027.sync_runs`);
  });
  afterAll(async () => {
    await db.execute(sql`delete from ams2027.sync_runs`);
    await conn?.close();
  });

  test("with no API address set, records the failed run as the console does, saying what to set", async () => {
    const { code, stderr } = await sync();
    expect(code).toBe(1);
    expect(stderr).toContain("Set CONFERENCE_API_URL and CONFERENCE_API_KEY to send the programme.");
    expect((await log.runs())[0]).toMatchObject({
      state: "failed",
      error: "Set CONFERENCE_API_URL and CONFERENCE_API_KEY to send the programme.",
    });
  });

  test("while another send runs, says so and writes nothing", async () => {
    await log.start();
    const { code, stderr } = await sync();
    expect(code).toBe(1);
    expect(stderr).toContain("A send is already running");
    expect(stderr).not.toContain("    at ");
    expect(await log.runs()).toHaveLength(1);
  });
});
