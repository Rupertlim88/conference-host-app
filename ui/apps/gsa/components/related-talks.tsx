"use client";

import { trpc } from "@/lib/trpc";

import { RelatedPanel } from "./related-panel";

/** The related-talks panel, wired to the backend, which asks the conference API. */
export function RelatedTalks({ talkId }: { talkId: string }) {
  const related = trpc.talks.related.useQuery({ id: talkId });
  return <RelatedPanel related={related.data} loading={related.isLoading} failed={related.isError} />;
}
