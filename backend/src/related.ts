// A talk's related talks are the matching API's matches shown as this programme's talks, in the API's order.
import type { RelatedTalks, TalkSummary } from "@repo/host-contracts";

import type { ConferenceApi } from "./matching-api";

export const RELATED_TOP = 5;

/** The related-talks panel for one talk: the API's matches joined to this programme's talks, up to `top` of them. */
export async function relatedTalks(
  store: { talkSummaries(ids: string[]): Promise<TalkSummary[]> },
  api: ConferenceApi,
  talkId: string,
  top: number = RELATED_TOP,
): Promise<RelatedTalks> {
  const answer = await api.related(talkId, top);
  if (answer.status === "unavailable") return { status: "unavailable" };
  const talks = new Map((await store.talkSummaries(answer.matches.map((x) => x.talk))).map((t) => [t.id, t]));
  const matches = answer.matches.flatMap((x) => {
    const talk = talks.get(x.talk);
    return talk ? [{ talk, kind: x.kind, score: x.score, reason: x.description }] : [];
  });
  return matches.length ? { status: "matches", matches } : { status: "none" };
}
