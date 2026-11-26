// Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's pools around it, by kind.
import type { Match, Pool, PoolType } from "@repo/contracts";
import { Id, type AroundAbstract, type AroundPool, type AroundPools } from "@repo/host-contracts";
import type { DemoSettings, ProgrammeStore } from "@repo/host-store";

import type { ConferenceApi } from "./matching-api";

/** The kinds of pool our improvements show around the fixed abstract, asked for in one search. */
export const AROUND_POOLS = ["subConference", "day", "timeBlock", "session"] satisfies PoolType[];

/** The fixed abstract, its session's conferences, and the matching API's pools around it; the pools are null when the
 *  API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, abstractTrackIds: [], pools: null };
  const [session, answer] = await Promise.all([
    abstract.sessionId ? store.session(abstract.sessionId) : null,
    api.pooled(abstract.id, AROUND_POOLS),
  ]);
  const abstractTrackIds = session?.trackIds ?? [];
  if (answer.status === "unavailable") return { abstract, abstractTrackIds, pools: null };
  return { abstract, abstractTrackIds, pools: await joinPools(store, answer.matches) };
}

/** The API's results grouped by pool, each pool's matches in the API's order, as this programme's talks with the
 *  conferences each is in. A match to a talk this programme does not show is left out, and so is a pool it cannot name. */
async function joinPools(store: ProgrammeStore, results: Match[]): Promise<AroundPools> {
  const ids = [...new Set(results.map((r) => r.talk))];
  const [summaries, tracks] = await Promise.all([store.talkSummaries(ids), store.tracksOfTalks(ids)]);
  const talks = new Map(summaries.map((t) => [t.id, t]));
  const pools: AroundPools = { subConference: [], day: [], timeBlock: [], session: [] };
  const found = new Map<string, AroundPool>();
  for (const result of results) {
    const talk = talks.get(result.talk);
    const place = result.pool ? placeOf(result.pool) : null;
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

/** A result's pool as this programme names it: a time block by its start instant. Null for the whole conference, and
 *  for a conference or session whose id is not one of this programme's ids. */
function placeOf(pool: Pool): { type: keyof AroundPools; id: string } | null {
  switch (pool.type) {
    case "conference":
      return null;
    case "day":
      return pool;
    case "timeBlock":
      return { type: "timeBlock", id: new Date(pool.id).toISOString() };
    default:
      return Id.safeParse(pool.id).success ? pool : null;
  }
}
