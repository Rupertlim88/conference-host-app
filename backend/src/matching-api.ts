// The host app talks to a matching API only in the form of the conference API's contract.
import {
  MatchesSearchRequestSchema,
  MatchesSearchResponseSchema,
  ProblemSchema,
  TalksWriteRequestSchema,
  TalksWriteResponseSchema,
  type Match,
  type PoolType,
  type TalksWriteRequest,
  type TalksWriteResponse,
} from "@repo/contracts";
import type { ConnectionStatus, Society } from "@repo/host-contracts";

/** The conference id each society's programme is filed under at the conference API. */
export const CONFERENCE_IDS: Record<Society, string> = { ams: "ams-2027" };

export type PooledAnswer = { status: "ok"; matches: Match[] } | { status: "unavailable" };

/** The most talks one matches search may name, as the conference API's contract allows. */
export const TALKS_PER_SEARCH = 1000;

export interface ConferenceApi {
  /** The matches for a talk that the matching API lists in these kinds of pool: every page of one matches search. */
  pooled(talkId: string, pools: PoolType[]): Promise<PooledAnswer>;
  /** Every verdict the matching API has for a talk against these talks, matches or not, as it gave them: every page
   *  of one search for each thousand talks. */
  verdicts(talkId: string, talks: string[]): Promise<PooledAnswer>;
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

/** A request that does not fit the conference API's contract; it was never sent. */
export class RequestNotSent extends Error {
  constructor(problems: string) {
    super(`The request did not fit the conference API's contract, so it was not sent: ${problems}`);
    this.name = "RequestNotSent";
  }
}

/** Throws RequestNotSent unless the body fits the schema. The body itself is sent unchanged. */
function checked(schema: { safeParse(body: unknown): { success: boolean; error?: { issues: { message: string }[] } } }, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) throw new RequestNotSent(result.error!.issues.slice(0, 5).map((i) => i.message).join("; "));
  return body;
}

/** No API address is set, so nothing can be sent; the message says what to set. */
export class ApiNotSet extends Error {
  constructor() {
    super("Set CONFERENCE_API_URL and CONFERENCE_API_KEY to send the programme.");
    this.name = "ApiNotSet";
  }
}

/** Throws RequestNotSent unless a talks write fits the contract; a send checks every part with it before writing any. */
export function checkTalksWrite(req: TalksWriteRequest): void {
  checked(TalksWriteRequestSchema, req);
}

/** Used when no API address is set: every matches search is unavailable. */
export const unconfiguredApi: ConferenceApi = {
  pooled: async () => ({ status: "unavailable" }),
  verdicts: async () => ({ status: "unavailable" }),
  writeTalks: async () => {
    throw new ApiNotSet();
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
  const post = (path: string, body: unknown, signal: AbortSignal) =>
    fetch(`${base}/${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${opts.key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

  /** Every page of one matches search, in pages of a thousand, all before the deadline; null when a page fails. */
  async function everyPage(ask: object, deadline: AbortSignal): Promise<Match[] | null> {
    const matches: Match[] = [];
    let pageToken: string | undefined;
    do {
      const body = { ...ask, pageSize: 1000, ...(pageToken ? { pageToken } : {}) };
      const res = await post("matches:search", checked(MatchesSearchRequestSchema, body), deadline);
      if (!res.ok) return null;
      const page = MatchesSearchResponseSchema.safeParse(await res.json());
      if (!page.success) return null;
      matches.push(...page.data.matches);
      pageToken = page.data.nextPageToken;
    } while (pageToken);
    return matches;
  }

  return {
    async pooled(talkId, pools) {
      try {
        // One time limit covers every page.
        const matches = await everyPage({ likeTalks: [talkId], pools }, AbortSignal.timeout(opts.timeoutMs ?? 3000));
        return matches ? { status: "ok", matches } : { status: "unavailable" };
      } catch {
        return { status: "unavailable" };
      }
    },

    async verdicts(talkId, talks) {
      const matches: Match[] = [];
      try {
        for (let i = 0; i < talks.length; i += TALKS_PER_SEARCH) {
          const ask = { likeTalks: [talkId], talks: talks.slice(i, i + TALKS_PER_SEARCH), include: "all" };
          // Each search has the conference API's own time limit, across its pages.
          const found = await everyPage(ask, AbortSignal.timeout(opts.timeoutMs ?? 10_000));
          if (!found) return { status: "unavailable" };
          matches.push(...found);
        }
        return { status: "ok", matches };
      } catch {
        return { status: "unavailable" };
      }
    },

    async check(talkId) {
      const started = performance.now();
      const ms = () => Math.round(performance.now() - started);
      try {
        const body = checked(MatchesSearchRequestSchema, { likeTalks: [talkId], topPerPerson: 1 });
        const res = await post("matches:search", body, AbortSignal.timeout(opts.timeoutMs ?? 5000));
        const validBody = res.ok && MatchesSearchResponseSchema.safeParse(await res.json().catch(() => null)).success;
        return { outcome: { kind: "answered", httpStatus: res.status, validBody }, ms: ms() };
      } catch {
        return { outcome: { kind: "unreachable" }, ms: ms() };
      }
    },

    async writeTalks(req, signal) {
      const limit = AbortSignal.timeout(opts.timeoutMs ?? 60_000);
      const res = await post("talks:write", checked(TalksWriteRequestSchema, req), signal ? AbortSignal.any([limit, signal]) : limit);
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

export type ConnectionOutcome =
  | { kind: "not-set" }
  | { kind: "unreachable" }
  | { kind: "answered"; httpStatus: number; validBody: boolean };

export function connectionStatus(outcome: ConnectionOutcome): ConnectionStatus {
  if (outcome.kind !== "answered") return outcome.kind;
  const { httpStatus, validBody } = outcome;
  if (httpStatus === 401 || httpStatus === 403) return "refused-key";
  if (httpStatus === 404) return "no-programme";
  return httpStatus >= 200 && httpStatus < 300 && validBody ? "ok" : "unexpected-answer";
}
