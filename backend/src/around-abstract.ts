// Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's matches for it with the conferences each is in.
import type { AroundAbstract } from "@repo/host-contracts";
import type { DemoSettings, ProgrammeStore } from "@repo/host-store";

import type { ConferenceApi } from "./matching-api";
import { relatedTalks } from "./related";

/** How many of the fixed abstract's matches are asked for: enough to reach every time block the API matched. */
export const ABSTRACT_TOP = 20;

/** The fixed abstract, its session's conferences, and its matches as this programme's talks, each with the conferences
 *  its talk is in; the matches are null when the API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, abstractTrackIds: [], matches: null };
  const [session, related] = await Promise.all([
    abstract.sessionId ? store.session(abstract.sessionId) : null,
    relatedTalks(store, api, abstract.id, ABSTRACT_TOP),
  ]);
  const abstractTrackIds = session?.trackIds ?? [];
  if (related.status === "unavailable") return { abstract, abstractTrackIds, matches: null };
  const matches = related.status === "matches" ? related.matches : [];
  const tracks = await store.tracksOfTalks(matches.map((m) => m.talk.id));
  return { abstract, abstractTrackIds, matches: matches.map((m) => ({ ...m, tracks: tracks[m.talk.id] ?? [] })) };
}
