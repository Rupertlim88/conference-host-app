import type { SyncRun } from "@repo/host-contracts";
import type { SyncLog } from "@repo/host-store";

import { ApiRefusedError, type ConferenceApi } from "./conference-api";
import { NothingToSend, syncProgramme, type SyncTalk } from "./sync";

// The rule "two sends never run at once" is model-checked: .claude/skills/verify-send-runs. Change this file's
// order of steps, or this number, only with that check.
/** No send writes to the conference API for longer than this. It must stay shorter than STALE_AFTER_MINUTES in
 *  data/store/src/sync-log.ts, after which another send may take over a run that never finished. */
export const SEND_DEADLINE_MS = 5 * 60_000;

/** Another send is running; this one wrote nothing. */
export class SendRunning extends Error {
  constructor() {
    super("A send is already running. Try again when it has finished.");
    this.name = "SendRunning";
  }
}

/** The send failed and was recorded as failed: `run` is that record, `cause` the error. */
export class SendFailed extends Error {
  constructor(
    readonly run: SyncRun,
    cause: unknown,
  ) {
    super(`The send failed: ${run.error}`, { cause });
    this.name = "SendFailed";
  }
}

/** Why a send failed, for the run log: never the API's body or the key. */
function failure(error: unknown, deadline: AbortSignal): string {
  if (deadline.aborted) return "Stopped at the send's deadline";
  if (error instanceof NothingToSend) return error.message;
  if (error instanceof ApiRefusedError) return `${error.status} ${error.title}`;
  if (error instanceof DOMException && error.name === "TimeoutError") return "The conference API did not answer in time";
  if (error instanceof TypeError) return "Could not reach the conference API";
  return "Unexpected error";
}

/**
 * Sends the shown programme to the conference API as one run in the log, and returns the finished run. Throws
 * SendRunning when another send is running. A failure is recorded in the log, then thrown as SendFailed.
 */
export async function sendProgramme(opts: {
  store: { talksForSync(): Promise<SyncTalk[]> };
  log: SyncLog;
  api: ConferenceApi;
  deadlineMs?: number;
}): Promise<SyncRun> {
  // The deadline starts before the run does, so no write outlives the run's own start by more than it.
  const deadline = AbortSignal.timeout(opts.deadlineMs ?? SEND_DEADLINE_MS);
  const run = await opts.log.start();
  if (!run) throw new SendRunning();
  try {
    const result = await syncProgramme(opts.store, opts.api, run.syncName, deadline);
    return await opts.log.finish(run.id, result);
  } catch (error) {
    throw new SendFailed(await opts.log.fail(run.id, failure(error, deadline)), error);
  }
}
