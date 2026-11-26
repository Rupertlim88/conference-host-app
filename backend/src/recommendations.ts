// For each abstract tested, the host app reports what each place chose from, what it shows, and every verdict the matching API gave.
import type { TalkInput } from "@repo/contracts";
import {
  PlaceLayoutSchema,
  RecommendationsInputSchema,
  RecommendationsSchema,
  SHOWN_PER_PLACE,
  type AroundMatch,
  type AroundPools,
  type Place,
  type PlaceLayout,
  type Recommendations,
  type RelatedTalks,
} from "@repo/host-contracts";
import type { ProgrammeStore, SyncLog, TestSets } from "@repo/host-store";

import { AROUND_KINDS, poolsFrom } from "./around-abstract";
import type { ConferenceApi } from "./matching-api";
import { relatedFrom } from "./related";
import { toPartnerTalk } from "./send";
import { plain } from "./tester-token";

export interface RecommendationsDeps {
  store: ProgrammeStore;
  testSets: Pick<TestSets, "latest">;
  log: Pick<SyncLog, "runs">;
  api: ConferenceApi;
}

/** A place and the held talks it chooses from. A time block also keeps its start with its offset, to find its pool. */
interface PlaceToAsk {
  layout: PlaceLayout;
  key: string;
  pool: string[];
  start?: string;
}

const LAYOUTS = PlaceLayoutSchema.options;

/** The places around an abstract, each with the held talks it chooses from: the talks a send carries, placed as the
 *  matching API places them, by their conferences and their session's start, the abstract itself left out. A
 *  conference of the abstract's session is its own. A place that holds no talk is left out. */
export function placesAround(abstract: string, ownTrackIds: string[], sent: TalkInput[]): PlaceToAsk[] {
  const own = new Set(ownTrackIds);
  const places = new Map<string, PlaceToAsk>();
  const add = (layout: PlaceLayout, key: string, talkId: string, start?: string) => {
    const place = places.get(`${layout} ${key}`) ?? { layout, key, pool: [], ...(start ? { start } : {}) };
    place.pool.push(talkId);
    places.set(`${layout} ${key}`, place);
  };
  for (const talk of sent) {
    if (talk.id === abstract) continue;
    add("related", abstract, talk.id);
    for (const track of new Set(talk.tracks ?? [])) add(own.has(track) ? "conference_inside" : "conference_outside", track, talk.id);
    const start = talk.session?.start;
    if (start) {
      add("day", start.slice(0, 10), talk.id);
      add("time_block", start.slice(0, 16), talk.id, start);
    }
    if (talk.session) add("session", talk.session.id, talk.id);
  }
  return [...places.values()].sort((a, b) => LAYOUTS.indexOf(a.layout) - LAYOUTS.indexOf(b.layout) || a.key.localeCompare(b.key));
}

/** What a place shows visitors with this abstract as the attendee's: the picks the pages make, from the same answers,
 *  as many as the place shows. */
function shownIn(place: PlaceToAsk, pools: AroundPools, related: RelatedTalks, listed: Set<string>, sessionStart: Map<string, string | null>): string[] {
  const first = (matches: AroundMatch[] = []) => matches.slice(0, SHOWN_PER_PLACE[place.layout]).map((m) => m.talk.id);
  switch (place.layout) {
    case "related":
      return related.status === "matches" ? related.matches.map((m) => m.talk.id) : [];
    case "conference_outside":
    case "conference_inside":
      // Conferences and Symposia ranks only the conferences its list shows.
      return listed.has(place.key) ? first(pools.subConference.find((p) => p.id === place.key)?.matches) : [];
    case "day":
      return first(pools.day.find((p) => p.id === place.key)?.matches);
    case "time_block": {
      // The calendar recommends the sessions of listed talks whose session starts with the block.
      const at = Date.parse(place.start!);
      const matches = pools.timeBlock.find((p) => Date.parse(p.id) === at)?.matches ?? [];
      return first(matches.filter((m) => Date.parse(sessionStart.get(m.talk.id) ?? "") === at));
    }
    case "session":
      return first(pools.session.find((p) => p.id === place.key)?.matches.filter((m) => m.talk.sessionId === place.key));
  }
}

/** The report on one abstract: null when the demo does not hold and show it, "unavailable" when the matching API cannot
 *  answer one of the searches, and how many restrictions it is still judging for the abstract, when it is judging any. */
export type Report = { status: "ready"; report: Recommendations } | { status: "judging"; restrictions: number } | { status: "unavailable" } | null;

/** The report on one abstract the demo holds. Every search is made even while some are still being judged, so that a
 *  single later ask finds every place judged. */
export async function reportOn(abstractId: string, deps: RecommendationsDeps): Promise<Report> {
  const [abstract] = await deps.store.talkSummaries([abstractId]);
  if (!abstract) return null;
  const [session, forSync, tracks, runs] = await Promise.all([
    abstract.sessionId ? deps.store.session(abstract.sessionId) : null,
    deps.store.talksForSync(),
    deps.store.tracks(),
    deps.log.runs(),
  ]);
  const sent = forSync.map(toPartnerTalk).filter((t): t is TalkInput => t !== null);
  const sessionStart = new Map(sent.map((t) => [t.id, t.session?.start ?? null]));
  const listed = new Set(tracks.map((t) => t.id));
  const toAsk = placesAround(abstract.id, session?.trackIds ?? [], sent);

  // What each place shows comes from one search of the restrictions the pages ask for.
  const shown = await deps.api.restricted(abstract.id, ["conference", ...AROUND_KINDS]);
  if (shown.status === "unavailable") return { status: "unavailable" };
  const [related, pools] = await Promise.all([relatedFrom(deps.store, shown.matches), poolsFrom(deps.store, shown.matches)]);
  let judging = shown.judging.length;

  const places: Place[] = [];
  // One search at a time, so a large test set never floods the matching API.
  for (const place of toAsk) {
    const answer = await deps.api.verdicts(abstract.id, place.pool);
    if (answer.status === "unavailable") return { status: "unavailable" };
    judging += answer.judging.length;
    const judged = new Set(answer.matches.map((m) => m.talk));
    places.push({
      layout: place.layout,
      key: place.key,
      pool: place.pool,
      shown: shownIn(place, pools, related, listed, sessionStart),
      verdicts: answer.matches,
      notJudged: place.pool.filter((id) => !judged.has(id)),
    });
  }
  if (judging > 0) return { status: "judging", restrictions: judging };
  const versioned = places.flatMap((p) => p.verdicts).find((v) => typeof v.programmeVersion === "string");
  return {
    status: "ready",
    report: {
      abstract: abstract.id,
      sentProgrammeVersion: runs.find((r) => r.state === "sent")?.programmeVersion ?? null,
      matchesProgrammeVersion: versioned ? String(versioned.programmeVersion) : null,
      places,
    },
  };
}

/** The report on an abstract the stored test set tests: 400 without an abstract named, 404 for one it does not test or
 *  the demo does not show, 202 while the matching API is still judging anything for it, 502 when the matching API
 *  cannot answer. */
export async function answerRecommendations(req: Request, deps: RecommendationsDeps): Promise<Response> {
  const input = RecommendationsInputSchema.safeParse({ abstract: new URL(req.url).searchParams.get("abstract") });
  if (!input.success) return plain(400, "Name the abstract to report on, as ?abstract=<AMS id>.");
  const id = input.data.abstract;
  const testSet = await deps.testSets.latest();
  if (!testSet?.askers.includes(id)) return plain(404, `The stored test set does not test abstract ${id}.`);
  const report = await reportOn(id, deps);
  if (report === null) return plain(404, `Abstract ${id} is not among the talks the demo shows.`);
  switch (report.status) {
    case "unavailable":
      return plain(502, "The matching API could not answer, so there is no report.");
    case "judging": {
      const count = report.restrictions === 1 ? "1 restriction" : `${report.restrictions} restrictions`;
      return plain(202, `The matching API is still judging ${count} for this abstract; ask again shortly.`);
    }
    case "ready":
      return Response.json(RecommendationsSchema.parse(report.report));
  }
}
