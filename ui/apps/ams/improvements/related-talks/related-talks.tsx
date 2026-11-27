// In our improvements, every talk page shows a related-talks panel with the matching API's matches for that talk, and never breaks the page.

import type { RelatedTalks as Related } from "@repo/host-contracts";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Suspense } from "react";

import { serverApi } from "@/shared/server";
import { When } from "@/shared/meeting-time";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Change } from "@/versions/change";

/** The point of the demo: the conference API's matches for this talk. A failure here never breaks the page. */
export function RelatedPanel({ related, loading, failed }: { related: Related | undefined; loading: boolean; failed: boolean }) {
  const t = useTranslations("related");
  return (
    <section aria-labelledby="related-title" className="my-6 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
      <h2 id="related-title" className="flex items-center gap-2 text-lg font-semibold text-heading">
        <Sparkles className="size-5" aria-hidden />
        {t("title")}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">{t("subtitle")}</p>
      {loading && (
        <div className="space-y-2" aria-label={t("loading")}>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {(failed || related?.status === "unavailable") && <p className="text-sm">{t("unavailable")}</p>}
      {related?.status === "judging" && <p className="text-sm">{t("judging")}</p>}
      {related?.status === "matches" && (
        <ul className="space-y-2">
          {related.matches.map((m) => (
            <li key={m.talk.id}>
              <Link href={`/talks/${m.talk.id}`} className="block rounded-md border bg-white px-3 py-2 text-sm hover:shadow-sm">
                <span className="mb-1 flex items-center gap-2">
                  <Badge variant={m.kind === "unexpected" ? "default" : "secondary"}>{m.kind === "unexpected" ? t("unexpected") : t("core")}</Badge>{" "}
                  <span className="text-xs text-muted-foreground">
                    <When start={m.talk.startsAt} mode="date" /> · <When start={m.talk.startsAt} mode="time" />
                  </span>
                </span>{" "}
                <span className="text-primary">
                  {m.talk.number && (
                    <>
                      <span className="font-semibold">{m.talk.number}</span>{" "}
                    </>
                  )}
                  {m.talk.title}
                </span>{" "}
                <span className="mt-1 block text-xs text-muted-foreground">{m.reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The related-talks panel, filled from the backend, which asks the conference API about the talk on the screen. */
export async function RelatedTalks({ talkId }: { talkId: string }) {
  const related = await serverApi()
    .then((api) => api.talks.related({ id: talkId }))
    .catch(() => undefined);
  return <RelatedPanel related={related} loading={false} failed={!related} />;
}

/** After a talk's abstract, its related talks. They stream in after the rest of the page, which shows placeholders
 *  until they come, so a slow API never holds up the talk. */
export const relatedTalks: Change<"talk.afterAbstract"> = {
  at: "talk.afterAbstract",
  label: "relatedTalks",
  render: ({ talkId }) => (
    <Suspense fallback={<RelatedPanel related={undefined} loading failed={false} />}>
      <RelatedTalks talkId={talkId} />
    </Suspense>
  ),
};
