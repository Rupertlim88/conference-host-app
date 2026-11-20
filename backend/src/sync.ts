import type { TalkInput } from "@repo/contracts";

import type { ConferenceApi } from "./conference-api";

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
  const result: SyncResult = { sent: 0, added: 0, changed: 0, withdrawn: 0, unchanged: 0, programmeVersion: "" };
  for (let i = 0; i < talks.length; i += PART) {
    const part = talks.slice(i, i + PART);
    const last = i + PART >= talks.length;
    const answer = await api.writeTalks({ talks: part, sync: syncName, ...(last ? { complete: true } : {}) }, signal);
    result.sent += part.length;
    result.added += answer.added;
    result.changed += answer.changed;
    result.withdrawn += answer.withdrawn;
    result.unchanged += answer.unchanged;
    result.programmeVersion = answer.programmeVersion;
  }
  return result;
}
