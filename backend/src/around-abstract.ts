// Our improvements see the demo's fixed abstract, and how the matching API's matches for it fall across the tracks.
import type { AroundAbstract } from "@repo/host-contracts";
import type { DemoSettings, ProgrammeStore } from "@repo/host-store";

import type { ConferenceApi } from "./matching-api";
import { relatedTalks } from "./related";

/** The fixed abstract, with how many of its matches fall in each track; null counts when the API cannot answer. */
export async function aroundAbstract(store: ProgrammeStore, demo: DemoSettings, api: ConferenceApi): Promise<AroundAbstract> {
  const abstract = await demo.fixedAbstract();
  if (!abstract) return { abstract: null, matchesByTrack: null };
  const related = await relatedTalks(store, api, abstract.id);
  if (related.status === "unavailable") return { abstract, matchesByTrack: null };
  const matched = related.status === "matches" ? related.matches.map((m) => m.talk.id) : [];
  return { abstract, matchesByTrack: await store.matchesByTrack(matched) };
}
