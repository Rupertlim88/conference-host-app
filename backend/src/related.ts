// A talk's related talks are the matching API's matches shown as this programme's talks, in the API's order.
import { SHOWN_PER_PLACE, type RelatedTalks, type TalkSummary } from "@repo/host-contracts";

import type { ConferenceApi, Match } from "./matching-api";

type Talks = { talkSummaries(ids: string[]): Promise<TalkSummary[]> };

/** The related-talks panel for one talk: still being matched while the API is judging the talk; otherwise the matches
 *  the API lists under the whole conference, joined to this programme's talks, the first five of them. */
export async function relatedTalks(store: Talks, api: ConferenceApi, talkId: string): Promise<RelatedTalks> {
  const answer = await searchRelated(api, talkId);
  if (answer.status === "unavailable") return { status: "unavailable" };
  if (answer.judging.some((j) => j.basedOn === talkId)) return { status: "judging" };
  return relatedFrom(store, answer.matches);
}

/** The panel's search: the talk's matches under the whole conference, one more than the panel shows, so that a match
 *  to a talk this programme does not show still leaves five. The tester's report asks the same way. */
export function searchRelated(api: ConferenceApi, talkId: string) {
  return api.restricted(talkId, ["conference"], SHOWN_PER_PLACE.related + 1);
}

/** The panel from a search's results: those listed under the whole conference, in the API's order, joined to this
 *  programme's talks, the first five of them. The tester's report reads its related talks this way too. */
export async function relatedFrom(store: Talks, results: Match[]): Promise<RelatedTalks> {
  const listed = results.filter((x) => x.restriction.type === "conference");
  const talks = new Map((await store.talkSummaries(listed.map((x) => x.talk))).map((t) => [t.id, t]));
  const matches = listed
    .flatMap((x) => {
      const talk = talks.get(x.talk);
      return talk ? [{ talk, kind: x.kind, score: x.score, reason: x.description }] : [];
    })
    .slice(0, SHOWN_PER_PLACE.related);
  return matches.length ? { status: "matches", matches } : { status: "none" };
}
