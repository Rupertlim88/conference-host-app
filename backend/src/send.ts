// The programme is sent as one run at a time, in parts of a thousand talks, and stops at a five-minute deadline.
import type { TalkInput, TalksWriteRequest } from "@repo/contracts";
import type { SyncRun } from "@repo/host-contracts";
import type { SyncLog } from "@repo/host-store";

import { ApiNotSet, ApiRefusedError, checkTalksWrite, RequestNotSent, type ConferenceApi } from "./matching-api";

/** What the store's talksForSync returns, narrowed to what the upload needs. */
export interface SyncTalk {
  id: string;
  sessionId: string | null;
  number: string;
  title: string;
  abstract: string;
  kind: string;
  startsAt: Date | null;
  endsAt: Date | null;
  presentingAuthor: string;
  trackIds: string[];
  sessionTitle: string | null;
  sessionFormat: string | null;
  /** The session's start on the meeting's clock, with its offset: 2027-01-11T08:30:00-07:00. */
  sessionStart: string | null;
}

const PART = 1000;
const personId = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 128);

/** Control characters and the byte-order mark, which the conference API's plain text refuses. */
const isControl = (c: number) => (c <= 0x1f && c !== 0x09 && c !== 0x0a && c !== 0x0d) || (c >= 0x7f && c <= 0x9f) || c === 0xfeff;

/** Scraped text as plain text: control characters become spaces, and it is cut by Unicode characters, never
 *  inside one. */
const plain = (s: string, max: number) =>
  [...s]
    .map((ch) => (isControl(ch.codePointAt(0)!) ? " " : ch))
    .slice(0, max)
    .join("");

/** A store talk as the conference API's talk. Null for breaks, which are not talks to match, and for talks with
 *  no abstract, which the API cannot match. */
export function toPartnerTalk(t: SyncTalk): TalkInput | null {
  if (t.kind === "break") return null;
  const abstract = plain(t.abstract, 10_000);
  if (abstract.trim() === "") return null;
  const presenter = t.presentingAuthor ? personId(t.presentingAuthor) : "";
  const endsAfterStart = t.endsAt !== null && (t.startsAt === null || t.endsAt > t.startsAt);
  return {
    id: t.id,
    ...(t.number ? { number: plain(t.number, 64) } : {}),
    title: plain(t.title, 500),
    abstract,
    type: t.kind === "poster" ? "poster" : "oral",
    ...(t.trackIds.length ? { tracks: t.trackIds.slice(0, 20) } : {}),
    ...(t.sessionId
      ? {
          session: {
            id: t.sessionId,
            ...(t.sessionTitle ? { title: plain(t.sessionTitle, 500) } : {}),
            type: t.sessionFormat?.toLowerCase() === "poster" ? ("poster" as const) : ("oral" as const),
            ...(t.sessionStart ? { start: t.sessionStart } : {}),
          },
        }
      : {}),
    ...(t.startsAt ? { start: t.startsAt.toISOString() } : {}),
    ...(endsAfterStart ? { end: t.endsAt!.toISOString() } : {}),
    ...(presenter
      ? { authors: [{ id: presenter, name: plain(t.presentingAuthor, 300) }], presenters: [presenter] }
      : {}),
    status: "scheduled",
  };
}

/** Every talk is withdrawn or has no abstract. The API cannot be told an empty programme: a write needs a talk. */
export class NothingToSend extends Error {
  constructor() {
    super("There is nothing to send: every talk is withdrawn or has no abstract.");
    this.name = "NothingToSend";
  }
}

export interface SyncResult {
  sent: number;
  added: number;
  changed: number;
  withdrawn: number;
  unchanged: number;
  programmeVersion: string;
}

/** Sends the whole programme in parts under one sync name. The last part completes the sync, so the API withdraws
 *  talks no longer in the programme. Stops when `signal` aborts. Throws NothingToSend when no talk can be sent. */
export async function syncProgramme(
  store: { talksForSync(): Promise<SyncTalk[]> },
  api: ConferenceApi,
  syncName: string,
  signal?: AbortSignal,
): Promise<SyncResult> {
  const talks = (await store.talksForSync()).map(toPartnerTalk).filter((t): t is TalkInput => t !== null);
  if (talks.length === 0) throw new NothingToSend();
  const parts: TalksWriteRequest[] = [];
  for (let i = 0; i < talks.length; i += PART) {
    const last = i + PART >= talks.length;
    parts.push({ talks: talks.slice(i, i + PART), sync: syncName, ...(last ? { complete: true } : {}) });
  }
  // Every part is checked before the first is written, so a talk that breaks the contract leaves nothing half sent.
  for (const part of parts) checkTalksWrite(part);
  const result: SyncResult = { sent: 0, added: 0, changed: 0, withdrawn: 0, unchanged: 0, programmeVersion: "" };
  for (const part of parts) {
    const answer = await api.writeTalks(part, signal);
    result.sent += part.talks.length;
    result.added += answer.added;
    result.changed += answer.changed;
    result.withdrawn += answer.withdrawn;
    result.unchanged += answer.unchanged;
    result.programmeVersion = answer.programmeVersion;
  }
  return result;
}

// That two sends never write at once is model-checked: .claude/skills/verify-send-runs. Change this file's order of
// steps, or this number, only with that check.
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
  if (error instanceof RequestNotSent || error instanceof ApiNotSet) return error.message;
  if (error instanceof DOMException && error.name === "TimeoutError") return "The conference API did not answer in time";
  // fetch reports a network failure, such as a refused connection, as TypeError("fetch failed").
  if (error instanceof TypeError && error.message === "fetch failed") return "Could not reach the conference API";
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
