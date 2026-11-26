// Program Highlights' lists show the sessions or talks AMS marks for each.
import type { Highlight, HighlightList } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

import { TalkCard } from "@/base/cards";
import { PageTitle } from "@/base/frame";
import { SessionsByDay } from "@/base/programmes";

/** The lists among Program Highlights' sub-items, by their address. */
export const HIGHLIGHT_LISTS: Record<string, HighlightList> = {
  "people-themed": "themed",
  supplementary: "supplementary",
  keynotes: "keynotes",
  "new-fellows": "fellows",
  posters: "posters",
};

const ADDRESS: Record<HighlightList, string> = {
  themed: "people-themed",
  supplementary: "supplementary",
  keynotes: "keynotes",
  fellows: "new-fellows",
  posters: "posters",
};

/** One of Program Highlights' lists, under its name: sessions by day, or talks; an empty list says so. */
export function HighlightView({ list, highlight }: { list: HighlightList; highlight: Highlight }) {
  const t = useTranslations();
  const empty = highlight.sessions.length === 0 && highlight.talks.length === 0;
  return (
    <>
      <PageTitle>{t(`menu.highlights.${ADDRESS[list]}`)}</PageTitle>
      {empty && <p className="text-sm text-muted-foreground">{t("lists.empty")}</p>}
      <SessionsByDay sessions={highlight.sessions} />
      {highlight.talks.length > 0 && (
        <div className="space-y-2">
          {highlight.talks.map((talk) => (
            <TalkCard key={talk.id} talk={talk} />
          ))}
        </div>
      )}
    </>
  );
}
