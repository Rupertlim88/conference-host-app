// The host app talks to a matching API only in the form of the conference API's contract.
import {
  MatchesSearchRequestSchema,
  MatchesSearchResponseSchema,
  ProblemSchema,
  TalksWriteRequestSchema,
  TalksWriteResponseSchema,
  type Connection,
  type MatchesSearchResponse,
  type Restriction,
  type RestrictionRequest,
  type RestrictionType,
  type TalksWriteRequest,
  type TalksWriteResponse,
} from "@repo/contracts/public";
import type { ConnectionStatus, Society } from "@repo/host-contracts";

/** The conference id each society's programme is filed under at the conference API. */
export const CONFERENCE_IDS: Record<Society, string> = { ams: "ams-2027" };

/** A restriction the matching API is judging for the first time for one of the asker's talks: its matches appear when
 *  it is asked again a little later. */
export type Judging = NonNullable<MatchesSearchResponse["judging"]>[number];

/** A match as the host app uses it: the other talk of a connection, the restriction it is listed under, its kind and
 *  score, and the main talk's description of why the other talk is relevant to it. */
export interface Match {
  talk: string;
  restriction: Restriction;
  kind: Connection["kind"];
  score: number;
  description: string;
}

/** The matches of a restricted search, in the API's order, and the restrictions it is still judging. */
export type RestrictedAnswer = { status: "ok"; matches: Match[]; judging: Judging[] } | { status: "unavailable" };

/** The connections a search lists, as the API gave them, in its order, and the restrictions it is still judging. */
export type ConnectionsAnswer = { status: "ok"; connections: Connection[]; judging: Judging[] } | { status: "unavailable" };

/** A kind of restriction that groups the programme: every kind but the talks a search names. */
export type StandardKind = Exclude<RestrictionType, "talks">;

/** The most talks one matches search may name, as the conference API's contract allows. */
export const TALKS_PER_SEARCH = 1000;

export interface ConferenceApi {
  /** The matches the matching API lists for a talk under every restriction of these kinds, at most `top` in each, best
   *  first, and those it is still judging: every page of one matches search. */
  restricted(talkId: string, kinds: StandardKind[], top: number): Promise<RestrictedAnswer>;
  /** Every connection the matching API lists for a talk under the talks restriction of these talks, which are only
   *  matches, as it gave them, and whether it is still judging them: every page of one search for each thousand
   *  talks. */
  verdicts(talkId: string, talks: string[]): Promise<ConnectionsAnswer>;
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

/** What one matches search asks for: its restrictions, and how many matches to list in each. */
interface Search {
  restrictions: RestrictionRequest[];
  top: number;
}

/** A connection as the host app uses it. Every pair follows the order of its talks, the main talk first, so the other
 *  talk and the main talk's description come second and first. */
function asMatch(connection: Connection): Match {
  const { talks, restriction, kind, score, descriptions } = connection;
  return { talk: talks[1], restriction, kind, score, description: descriptions[0] };
}

/** Used when no API address is set: every matches search is unavailable. */
export const unconfiguredApi: ConferenceApi = {
  restricted: async () => ({ status: "unavailable" }),
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

  /** Every page of one search for a talk's connections under these restrictions, at most `top` in each, in pages of a
   *  thousand, all before the deadline: the talk's entry joined where it continues on the next page, in the API's
   *  order, with each restriction still being judged once, though every page names it; null when a page fails. */
  async function everyPage(talkId: string, search: Search, deadline: AbortSignal) {
    const connections: Connection[] = [];
    const judging = new Map<string, Judging>();
    let pageToken: string | undefined;
    do {
      const body = { likeTalks: [talkId], ...search, pageSize: 1000, ...(pageToken ? { pageToken } : {}) };
      const res = await post("matches:search", checked(MatchesSearchRequestSchema, body), deadline);
      if (!res.ok) return null;
      const page = MatchesSearchResponseSchema.safeParse(await res.json());
      if (!page.success) return null;
      for (const entry of page.data.abstracts) if (entry.talk === talkId) connections.push(...entry.connections);
      for (const j of page.data.judging ?? []) judging.set(JSON.stringify(j), j);
      pageToken = page.data.nextPageToken;
    } while (pageToken);
    return { connections, judging: [...judging.values()] };
  }

  /** Every search in turn, each with its own time limit across its pages; their answers joined in order. */
  async function everySearch(talkId: string, searches: Search[], timeoutMs: number): Promise<ConnectionsAnswer> {
    const answer = { status: "ok" as const, connections: [] as Connection[], judging: [] as Judging[] };
    try {
      for (const search of searches) {
        const found = await everyPage(talkId, search, AbortSignal.timeout(timeoutMs));
        if (!found) return { status: "unavailable" };
        answer.connections.push(...found.connections);
        answer.judging.push(...found.judging);
      }
      return answer;
    } catch {
      return { status: "unavailable" };
    }
  }

  return {
    // Every restriction of each kind, at most `top` matches in each: no ids and no K.
    async restricted(talkId, kinds, top) {
      const restrictions = kinds.map((type) => ({ type }) as RestrictionRequest);
      const answer = await everySearch(talkId, [{ restrictions, top }], opts.timeoutMs ?? 3000);
      if (answer.status === "unavailable") return answer;
      return { status: "ok", matches: answer.connections.map(asMatch), judging: answer.judging };
    },

    // The talks restriction, like every restriction, lists only the talks it names that match; asking for as many as
    // it names lists every one.
    verdicts: (talkId, talks) => {
      const searches: Search[] = [];
      for (let i = 0; i < talks.length; i += TALKS_PER_SEARCH) {
        const ids = talks.slice(i, i + TALKS_PER_SEARCH);
        searches.push({ restrictions: [{ type: "talks", ids }], top: ids.length });
      }
      return everySearch(talkId, searches, opts.timeoutMs ?? 10_000);
    },

    async check(talkId) {
      const started = performance.now();
      const ms = () => Math.round(performance.now() - started);
      try {
        const body = checked(MatchesSearchRequestSchema, { likeTalks: [talkId], top: 1 });
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
