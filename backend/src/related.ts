// A talk's related talks are the matching API's matches shown as this programme's talks, in the API's order.
import type { RelatedTalks, TalkSummary } from "@repo/host-contracts";

import type { ConferenceApi } from "./matching-api";

/** How many related talks a talk's panel shows, of the up to ten the whole conference's pool lists. */
export const RELATED_SHOWN = 5;

/** The related-talks panel for one talk: the matches the API lists in the whole conference's pool, joined to this
 *  programme's talks, the first five of them. */
export async function relatedTalks(
  store: { talkSummaries(ids: string[]): Promise<TalkSummary[]> },
  api: ConferenceApi,
  talkId: string,
): Promise<RelatedTalks> {
  const answer = await api.pooled(talkId, ["conference"]);
  if (answer.status === "unavailable") return { status: "unavailable" };
  const listed = answer.matches.filter((x) => x.pool?.type === "conference");
  const talks = new Map((await store.talkSummaries(listed.map((x) => x.talk))).map((t) => [t.id, t]));
  const matches = listed
    .flatMap((x) => {
      const talk = talks.get(x.talk);
      return talk ? [{ talk, kind: x.kind, score: x.score, reason: x.description }] : [];
    })
    .slice(0, RELATED_SHOWN);
  return matches.length ? { status: "matches", matches } : { status: "none" };
}
