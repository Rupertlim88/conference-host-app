// Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's pools around it, by kind.
import type { Restriction } from "@repo/contracts";
import { Id, SHOWN_PER_PLACE, type AroundAbstract, type AroundPool, type AroundPools, type LaidOutSession, type TalkSummary, type Track } from "@repo/host-contracts";
import type { DemoSettings, Seating, ProgrammeStore } from "@repo/host-store";

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

/** The fixed abstract, the conferences it sits in, the matching API's pools around it, and the sessions a test set's
 *  layout places the talks in; the pools are null when the API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, abstractTrackIds: [], pools: null, layout: null };
  const [placed, answer] = await Promise.all([store.seating(), searchAround(api, abstract.id)]);
  const abstractTrackIds = ownConferences(abstract.id, placed);
  const layout = placed.laidOut ? await laidOutSessions(store, placed) : null;
  if (answer.status === "unavailable") return { abstract, abstractTrackIds, pools: null, layout };
  return { abstract, abstractTrackIds, pools: await poolsFrom(store, answer.matches, placed, abstractTrackIds), layout };
}

/** The attendee's own conferences, around their abstract: those of its session where AMS placed it, or, in a layout,
 *  those the layout puts it in. */
export function ownConferences(talkId: string, placed: Seating): string[] {
  const talk = placed.talks.find((t) => t.id === talkId);
  if (!talk) return [];
  if (placed.laidOut) return talk.trackIds;
  return placed.sessions.find((s) => s.id === talk.sessionId)?.trackIds ?? [];
}

/** A talk as it sits: in a layout, in its session there, at that session's start, since a layout gives no talk its
 *  own time; otherwise as AMS placed it. */
function seated(talk: TalkSummary, placed: Seating): TalkSummary {
  if (!placed.laidOut) return talk;
  const sessionId = placed.talks.find((t) => t.id === talk.id)?.sessionId ?? null;
  const startsAt = placed.sessions.find((s) => s.id === sessionId)?.startsAt ?? null;
  return { ...talk, sessionId, startsAt, endsAt: null };
}

/** The sessions a layout places the talks in, each at its start there, keeping its length, with its talks in order. */
async function laidOutSessions(store: ProgrammeStore, placed: Seating): Promise<LaidOutSession[]> {
  const [sessions, talks] = await Promise.all([
    store.sessionSummaries(placed.sessions.map((s) => s.id)),
    store.talkSummaries(placed.sessions.flatMap((s) => s.talks)),
  ]);
  const talkById = new Map(talks.map((t) => [t.id, t]));
  return placed.sessions.flatMap((laid) => {
    const session = sessions.find((s) => s.id === laid.id);
    if (!session) return [];
    const length = session.startsAt && session.endsAt ? Date.parse(session.endsAt) - Date.parse(session.startsAt) : null;
    const endsAt = laid.startsAt && length !== null ? new Date(Date.parse(laid.startsAt) + length).toISOString() : null;
    const placedTalks = laid.talks.flatMap((id) => (talkById.has(id) ? [seated(talkById.get(id)!, placed)] : []));
    return [{ session: { ...session, startsAt: laid.startsAt, endsAt }, talks: placedTalks }];
  });
}

/** What the programme says about the matched talks, to place each match: the talks it shows, where each sits, their
 *  conferences, their sessions' starts, and the conferences the list shows other than the attendee's own. */
export interface Placing {
  talks: Map<string, TalkSummary>;
  tracksOf: Record<string, Track[]>;
  sessionStarts: Map<string, string>;
  conferences: Set<string>;
}

/** The pools around an abstract, for the API's results, with each talk where it sits: in a test set's layout when it
 *  has one. The attendee's own conferences, those the abstract sits in, have none. The tester's report reads its
 *  pools this way too. */
export async function poolsFrom(store: ProgrammeStore, results: Match[], placed: Seating, ownTrackIds: string[]): Promise<AroundPools> {
  const ids = [...new Set(results.map((r) => r.talk))];
  const own = new Set(ownTrackIds);
  const [summaries, listed] = await Promise.all([store.talkSummaries(ids), store.tracks()]);
  const trackIdsOf = new Map(placed.talks.map((t) => [t.id, t.trackIds]));
  return groupPools(results, {
    talks: new Map(summaries.map((t) => [t.id, seated(t, placed)])),
    tracksOf: Object.fromEntries(summaries.map((t) => [t.id, listed.filter((track) => trackIdsOf.get(t.id)?.includes(track.id))])),
    sessionStarts: new Map(placed.sessions.flatMap((s) => (s.startsAt ? [[s.id, s.startsAt] as const] : []))),
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
