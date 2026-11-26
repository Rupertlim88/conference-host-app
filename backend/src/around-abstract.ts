// Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's pools around it, by kind.
import type { Match, Restriction } from "@repo/contracts";
import { Id, type AroundAbstract, type AroundPool, type AroundPools } from "@repo/host-contracts";
import type { DemoSettings, ProgrammeStore } from "@repo/host-store";

import type { ConferenceApi, StandardKind } from "./matching-api";

/** The kinds of restriction our improvements show around the fixed abstract, every one of each kind, asked for in one
 *  search. The tester's report asks for them the same way. */
export const AROUND_KINDS: StandardKind[] = ["subConference", "day", "timeBlock", "session"];

/** The fixed abstract, its session's conferences, and the matching API's pools around it; the pools are null when the
 *  API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, abstractTrackIds: [], pools: null };
  const [session, answer] = await Promise.all([
    abstract.sessionId ? store.session(abstract.sessionId) : null,
    api.restricted(abstract.id, AROUND_KINDS),
  ]);
  const abstractTrackIds = session?.trackIds ?? [];
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
