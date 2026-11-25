import {
  MatchesSearchResponseSchema,
  ProblemSchema,
  TalksWriteResponseSchema,
  type Match,
  type TalksWriteRequest,
  type TalksWriteResponse,
} from "@repo/contracts";
import type { Society } from "@repo/host-contracts";

import type { ConnectionOutcome } from "./programme-rules";

/** The conference id each society's programme is filed under at the conference API. */
export const CONFERENCE_IDS: Record<Society, string> = { ams: "ams-2027" };

export type RelatedAnswer = { status: "ok"; matches: Match[] } | { status: "unavailable" };

export interface ConferenceApi {
  related(talkId: string, top: number): Promise<RelatedAnswer>;
  /** Writes talks; stops when `signal` aborts or the API takes longer than a minute. */
  writeTalks(req: TalksWriteRequest, signal?: AbortSignal): Promise<TalksWriteResponse>;
  /** One matches:search for a talk, to test the address and the key. Writes nothing, and keeps no body. */
  check(talkId: string): Promise<{ outcome: ConnectionOutcome; ms: number }>;
}

/** The API answered a write with an error: its HTTP status and its problem title. */
export class ApiRefusedError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    detail = title,
  ) {
    super(`Conference API refused the upload (${status}): ${detail}`);
    this.name = "ApiRefusedError";
  }
}

/** Used when no API address is set: every related-talks request is unavailable. */
export const unconfiguredApi: ConferenceApi = {
  related: async () => ({ status: "unavailable" }),
  writeTalks: async () => {
    throw new Error("Set CONFERENCE_API_URL and CONFERENCE_API_KEY to send the programme.");
  },
  check: async () => ({ outcome: { kind: "not-set" }, ms: 0 }),
};

export function conferenceApi(opts: {
  url: string;
  key: string;
  conference: string;
  timeoutMs?: number;
}): ConferenceApi {
  const base = `${opts.url.replace(/\/$/, "")}/v1/conferences/${encodeURIComponent(opts.conference)}`;
  const post = (path: string, body: unknown, timeoutMs: number, signal?: AbortSignal) =>
    fetch(`${base}/${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${opts.key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([AbortSignal.timeout(timeoutMs), signal]) : AbortSignal.timeout(timeoutMs),
    });

  return {
    async related(talkId, top) {
      try {
        const res = await post("matches:search", { likeTalks: [talkId], topPerPerson: top }, opts.timeoutMs ?? 3000);
        if (!res.ok) return { status: "unavailable" };
        const parsed = MatchesSearchResponseSchema.safeParse(await res.json());
        return parsed.success ? { status: "ok", matches: parsed.data.matches } : { status: "unavailable" };
      } catch {
        return { status: "unavailable" };
      }
    },

    async check(talkId) {
      const started = performance.now();
      const ms = () => Math.round(performance.now() - started);
      try {
        const res = await post("matches:search", { likeTalks: [talkId], topPerPerson: 1 }, opts.timeoutMs ?? 5000);
        const validBody = res.ok && MatchesSearchResponseSchema.safeParse(await res.json().catch(() => null)).success;
        return { outcome: { kind: "answered", httpStatus: res.status, validBody }, ms: ms() };
      } catch {
        return { outcome: { kind: "unreachable" }, ms: ms() };
      }
    },

    async writeTalks(req, signal) {
      const res = await post("talks:write", req, opts.timeoutMs ?? 60_000, signal);
      if (!res.ok) {
        const problem = ProblemSchema.safeParse(await res.json().catch(() => null));
        if (!problem.success) throw new ApiRefusedError(res.status, "no problem details");
        const { title, errors } = problem.data;
        throw new ApiRefusedError(res.status, title, errors ? `${title}: ${JSON.stringify(errors.slice(0, 5))}` : title);
      }
      return TalksWriteResponseSchema.parse(await res.json());
    },
  };
}
