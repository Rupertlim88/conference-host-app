// Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's pools around it, by kind.
import type { Restriction } from "@repo/contracts";
import { Id, SHOWN_PER_PLACE, type AroundAbstract, type AroundPool, type AroundPools, type TalkSummary, type Track } from "@repo/host-contracts";
import type { DemoSettings, ProgrammeStore } from "@repo/host-store";

import type { ConferenceApi, Match, StandardKind } from "./matching-api";

/** The kinds of restriction our improvements show around the fixed abstract, every one of each kind, asked for in one
 *  search. */
const AROUND_KINDS: StandardKind[] = ["subConference", "day", "timeBlock", "session"];

/** How many matches each restriction lists: one more than the largest box shows, so that a match a box cannot show
 *  still leaves it full. */
const AROUND_TOP = Math.max(SHOWN_PER_PLACE.conference_outside, SHOWN_PER_PLACE.day, SHOWN_PER_PLACE.time_block, SHOWN_PER_PLACE.session) + 1;

/** The search behind our improvements: the abstract's matches in every restriction of the four kinds. The tester's
 *  report asks the same way. */
export function searchAround(api: ConferenceApi, abstractId: string) {
  return api.restricted(abstractId, AROUND_KINDS, AROUND_TOP);
}

/** The fixed abstract, its session's conferences, and the matching API's pools around it; the pools are null when the
 *  API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, abstractTrackIds: [], pools: null };
  const [session, answer] = await Promise.all([
    abstract.sessionId ? store.session(abstract.sessionId) : null,
    searchAround(api, abstract.id),
  ]);
  const abstractTrackIds = session?.trackIds ?? [];
  if (answer.status === "unavailable") return { abstract, abstractTrackIds, pools: null };
  return { abstract, abstractTrackIds, pools: await poolsFrom(store, answer.matches, abstractTrackIds) };
}

/** What the programme says about the matched talks, to place each match: the talks it shows, their conferences, their
 *  sessions' starts, and the conferences the list shows other than the attendee's own. */
export interface Placing {
  talks: Map<string, TalkSummary>;
  tracksOf: Record<string, Track[]>;
  sessionStarts: Map<string, string>;
  conferences: Set<string>;
}

/** The pools around an abstract, read from the store for the API's results; the attendee's own conferences have none.
 *  The tester's report reads its pools this way too. */
export async function poolsFrom(store: ProgrammeStore, results: Match[], ownTrackIds: string[]): Promise<AroundPools> {
  const ids = [...new Set(results.map((r) => r.talk))];
  const [summaries, tracksOf, listed] = await Promise.all([store.talkSummaries(ids), store.tracksOfTalks(ids), store.tracks()]);
  const sessionIds = [...new Set(summaries.flatMap((t) => (t.sessionId ? [t.sessionId] : [])))];
  const own = new Set(ownTrackIds);
  return groupPools(results, {
    talks: new Map(summaries.map((t) => [t.id, t])),
    tracksOf,
    sessionStarts: await store.sessionStarts(sessionIds),
    conferences: new Set(listed.map((t) => t.id).filter((id) => !own.has(id))),
  });
}

/** How many matches each kind of pool keeps: as many as its box shows. */
const SHOWN: Record<keyof AroundPools, number> = {
  subConference: SHOWN_PER_PLACE.conference_outside,
  day: SHOWN_PER_PLACE.day,
  timeBlock: SHOWN_PER_PLACE.time_block,
  session: SHOWN_PER_PLACE.session,
};

/** The API's results grouped by restriction into pools that hold exactly what each box shows: the first matches the
 *  API lists in the API's order, as many as the box shows, each as this programme's talk with its conferences. A match
 *  to a talk this programme does not show is left out, and so is a restriction it cannot name, a conference its list
 *  does not show or that is the attendee's own, a talk in a time block its session does not start with, and a talk in
 *  a session it is not in. No pool is empty. */
export function groupPools(results: Match[], placing: Placing): AroundPools {
  const pools: AroundPools = { subConference: [], day: [], timeBlock: [], session: [] };
  const found = new Map<string, AroundPool>();
  for (const result of results) {
    const talk = placing.talks.get(result.talk);
    const place = placeOf(result.restriction);
    if (!talk || !place || !holds(place, talk, placing)) continue;
    const key = `${place.type} ${place.id}`;
    let pool = found.get(key);
    if (!pool) {
      pool = { id: place.id, matches: [] };
      found.set(key, pool);
      pools[place.type].push(pool);
    }
    if (pool.matches.length < SHOWN[place.type]) {
      pool.matches.push({ talk, kind: result.kind, score: result.score, reason: result.description, tracks: placing.tracksOf[talk.id] ?? [] });
    }
  }
  return pools;
}

/** Whether a place, as this programme shows it, holds the talk. */
function holds(place: { type: keyof AroundPools; id: string }, talk: TalkSummary, placing: Placing): boolean {
  switch (place.type) {
    case "subConference":
      return placing.conferences.has(place.id);
    case "day":
      return true;
    case "timeBlock": {
      const start = talk.sessionId ? placing.sessionStarts.get(talk.sessionId) : undefined;
      return start !== undefined && Date.parse(start) === Date.parse(place.id);
    }
    case "session":
      return talk.sessionId === place.id;
  }
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
