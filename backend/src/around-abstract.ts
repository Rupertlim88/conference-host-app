// Our improvements see the demo's fixed abstract, and how the matching API's matches for it fall across the tracks.
import type { AroundAbstract } from "@repo/host-contracts";
import type { DemoSettings, ProgrammeStore } from "@repo/host-store";

import type { ConferenceApi } from "./matching-api";
import { relatedTalks } from "./related";

/** How many of the fixed abstract's matches are asked for: enough to reach every time block the API matched. */
export const ABSTRACT_TOP = 20;

/** The fixed abstract, its matches as this programme's talks, and how many fall in each track; the matches and the
 *  counts are null when the API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, matches: null, matchesByTrack: null };
  const related = await relatedTalks(store, api, abstract.id, ABSTRACT_TOP);
  if (related.status === "unavailable") return { abstract, matches: null, matchesByTrack: null };
  const matches = related.status === "matches" ? related.matches : [];
  return { abstract, matches, matchesByTrack: await store.matchesByTrack(matches.map((m) => m.talk.id)) };
}
