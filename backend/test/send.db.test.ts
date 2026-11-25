import type { TalksWriteRequest } from "@repo/contracts";
import { amsTables, connect, createOrganiserStore, createProgramme, createSyncLog, loadRows, type Db } from "@repo/host-store";
import { migrateStore } from "@repo/host-store/migrate";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { ApiRefusedError, RequestNotSent, type ConferenceApi } from "../src/matching-api";
import { SendFailed, SendRunning, sendProgramme } from "../src/send";
import { rows } from "./programme";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;

/** A conference API that takes every write, recording each request. */
function taking(sent: TalksWriteRequest[]): ConferenceApi {
  return {
    related: async () => ({ status: "unavailable" }),
    check: async () => ({ outcome: { kind: "not-set" }, ms: 0 }),
    writeTalks: async (req) => {
      sent.push(req);
      return { programmeVersion: "pv_test", added: req.talks.length, changed: 0, withdrawn: 0, unchanged: 0, matchingJob: null };
    },
  };
}

/** A conference API that never answers, so a send ends only at its deadline. Like fetch, it rejects at once when the signal has already fired. */
function neverAnswering(): ConferenceApi {
  return {
    ...taking([]),
    writeTalks: (_req, signal) =>
      new Promise((_resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason);
        signal?.addEventListener("abort", () => reject(signal.reason));
      }),
  };
}

describe.skipIf(!url)("sendProgramme", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const store = createProgramme(db, "ams");
  const log = createSyncLog(db, "ams");

  beforeAll(async () => {
    await migrateStore(db);
    await loadRows(db, amsTables, rows);
  });
  beforeEach(async () => {
    await db.execute(sql`delete from ams2027.sync_runs`);
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("writes the shown programme under its run's sync name, completes it, and records the result", async () => {
    await createOrganiserStore(db, "ams").setWithdrawn("T2", true);
    const sent: TalksWriteRequest[] = [];
    try {
      const run = await sendProgramme({ store, log, api: taking(sent) });
      expect(run).toMatchObject({ state: "sent", sent: 1, added: 1, programmeVersion: "pv_test", error: "" });
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ sync: expect.stringMatching(/^send-/), complete: true });
      expect(sent[0]!.talks.map((t) => t.id)).toEqual(["T1"]);
      expect((await log.runs())[0]).toEqual(run);
    } finally {
      await createOrganiserStore(db, "ams").setWithdrawn("T2", false);
    }
  });

  test("records a refusal as failed with the API's status and problem title, and throws the failed run", async () => {
    const api: ConferenceApi = {
      ...taking([]),
      writeTalks: async () => {
        throw new ApiRefusedError(401, "Unauthorized");
      },
    };
    const failed = await sendProgramme({ store, log, api }).catch((e: unknown) => e);
    expect(failed).toBeInstanceOf(SendFailed);
    expect((failed as SendFailed).cause).toBeInstanceOf(ApiRefusedError);
    expect((failed as SendFailed).run).toMatchObject({ state: "failed", error: "401 Unauthorized" });
    expect((await log.runs())[0]).toEqual((failed as SendFailed).run);
  });

  test("records a request that does not fit the contract as failed, saying why, and sends nothing", async () => {
    const api: ConferenceApi = {
      ...taking([]),
      writeTalks: async () => {
        throw new RequestNotSent("talk 1 is sent twice");
      },
    };
    const failed = await sendProgramme({ store, log, api }).catch((e: unknown) => e);
    expect((failed as SendFailed).run).toMatchObject({
      state: "failed",
      error: "The request did not fit the conference API's contract, so it was not sent: talk 1 is sent twice",
    });
  });

  test("a programme with nothing to send is recorded as failed, and writes nothing", async () => {
    const organiser = createOrganiserStore(db, "ams");
    const sent: TalksWriteRequest[] = [];
    try {
      for (const id of ["T1", "T2"]) await organiser.setWithdrawn(id, true);
      await expect(sendProgramme({ store, log, api: taking(sent) })).rejects.toMatchObject({
        run: { state: "failed", error: "There is nothing to send: every talk is withdrawn or has no abstract." },
      });
      expect(sent).toEqual([]);
    } finally {
      for (const id of ["T1", "T2"]) await organiser.setWithdrawn(id, false);
    }
  });

  test("is refused while another send runs, and writes nothing", async () => {
    await log.start();
    const sent: TalksWriteRequest[] = [];
    await expect(sendProgramme({ store, log, api: taking(sent) })).rejects.toBeInstanceOf(SendRunning);
    expect(sent).toEqual([]);
  });

  test("stops a send whose deadline passes before the write starts", { timeout: 5_000 }, async () => {
    // Under load, reading the programme can outlast a short deadline, so the write starts with the signal already aborted.
    const api = neverAnswering();
    await expect(sendProgramme({ store, log, api, deadlineMs: 0 })).rejects.toMatchObject({
      run: { state: "failed", error: "Stopped at the send's deadline" },
    });
  });

  test("stops writing at its deadline and records the run as failed", async () => {
    const api = neverAnswering();
    await expect(sendProgramme({ store, log, api, deadlineMs: 50 })).rejects.toMatchObject({
      cause: { name: "TimeoutError" },
      run: { state: "failed", error: "Stopped at the send's deadline" },
    });
  });
});
