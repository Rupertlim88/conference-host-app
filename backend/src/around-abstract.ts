// Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's pools around it, by kind.
import type { Match, Restriction, RestrictionRequest } from "@repo/contracts";
import { Id, type AroundAbstract, type AroundPool, type AroundPools, type AroundScope } from "@repo/host-contracts";
import { zonedDateTime, type DemoSettings, type ProgrammeStore } from "@repo/host-store";

import type { ConferenceApi } from "./matching-api";

/** What our improvements ask the matching API for to show a page's places around an abstract: each kind the page
 *  shows, with exactly the ones it shows, the abstract's own conferences left out, and each time block named as a
 *  send names its sessions' start, on the meeting's clock with its offset. A kind with none left is left out. */
export function restrictionsFor(scope: AroundScope, ownTrackIds: string[], timeZone: string): RestrictionRequest[] {
  const own = new Set(ownTrackIds);
  const otherConferences = scope.subConference?.filter((id) => !own.has(id)) ?? [];
  return [
    ...(otherConferences.length ? [{ type: "subConference" as const, ids: otherConferences }] : []),
    ...(scope.day ? [{ type: "day" as const, ids: scope.day }] : []),
    ...(scope.timeBlock ? [{ type: "timeBlock" as const, ids: scope.timeBlock.map((at) => zonedDateTime(new Date(at), timeZone)) }] : []),
    ...(scope.session ? [{ type: "session" as const, ids: scope.session }] : []),
  ];
}

/** The fixed abstract, its session's conferences, and the matching API's pools around it for what one page shows;
 *  the pools are null when the API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi, scope: AroundScope): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, abstractTrackIds: [], pools: null };
  const [session, meeting] = await Promise.all([abstract.sessionId ? store.session(abstract.sessionId) : null, store.meeting()]);
  const abstractTrackIds = session?.trackIds ?? [];
  const answer = await api.restricted(abstract.id, restrictionsFor(scope, abstractTrackIds, meeting.timeZone));
  if (answer.status === "unavailable") return { abstract, abstractTrackIds, pools: null };
  return { abstract, abstractTrackIds, pools: await poolsFrom(store, answer.matches) };
}

/** The API's results grouped by restriction into pools, each pool's matches in the API's order, as this programme's
 *  talks with the conferences each is in. A match to a talk this programme does not show is left out, and so is a
 *  restriction it cannot name. The tester's report reads its pools this way too. */
export async function poolsFrom(store: ProgrammeStore, results: Match[]): Promise<AroundPools> {
  const ids = [...new Set(results.map((r) => r.talk))];
  const [summaries, tracks] = await Promise.all([store.talkSummaries(ids), store.tracksOfTalks(ids)]);
  const talks = new Map(summaries.map((t) => [t.id, t]));
  const pools: AroundPools = { subConference: [], day: [], timeBlock: [], session: [] };
  const found = new Map<string, AroundPool>();
  for (const result of results) {
    const talk = talks.get(result.talk);
    const place = result.restriction ? placeOf(result.restriction) : null;
    if (!talk || !place) continue;
    const key = `${place.type} ${place.id}`;
    let pool = found.get(key);
    if (!pool) {
      pool = { id: place.id, matches: [] };
      found.set(key, pool);
      pools[place.type].push(pool);
    }
    pool.matches.push({ talk, kind: result.kind, score: result.score, reason: result.description, tracks: tracks[talk.id] ?? [] });
  }
  return pools;
}

/** A result's restriction as this programme names it: a time block by its start instant. Null for the whole
 *  conference and the talks a search named, and for a conference or session whose id is not one of this programme's
 *  ids. */
function placeOf(restriction: Restriction): { type: keyof AroundPools; id: string } | null {
  switch (restriction.type) {
    case "conference":
    case "talks":
      return null;
    case "day":
      return restriction;
    case "timeBlock":
      return { type: "timeBlock", id: new Date(restriction.id).toISOString() };
    default:
      return Id.safeParse(restriction.id).success ? restriction : null;
  }
}
