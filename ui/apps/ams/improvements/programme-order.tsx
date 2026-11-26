// In our improvements, Conferences and Symposia puts the tracks with talks related to the demo's abstract first.
import type { AroundAbstract, Track } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { PageTitle } from "@/base/frame";

/** Tracks with more of the abstract's matches first; ties, and tracks with none, keep AMS's order. */
export function ProgrammeOrderView({ tracks, around }: { tracks: Track[]; around: AroundAbstract }) {
  const t = useTranslations();
  const counts = around.matchesByTrack;
  const ordered = counts ? [...tracks].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)) : tracks;
  const abstract = around.abstract;
  const note = !abstract
    ? t("improvements.noAbstract")
    : counts
      ? t("improvements.orderedAround", { abstract: abstract.number ? `${abstract.number} - ${abstract.title}` : abstract.title })
      : t("improvements.unavailable");
  return (
    <>
      <PageTitle>{t("programs.title")}</PageTitle>
      <p className="mb-3 text-sm">{note}</p>
      <ul className="divide-y rounded-md border">
        {ordered.map((track) => {
          const matches = counts?.[track.id] ?? 0;
          return (
            <li key={track.id}>
              <Link href={`/programs/${track.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-primary hover:bg-primary/5">
                {track.title}
                {matches > 0 && <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-950">{t("improvements.matches", { count: matches })}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
