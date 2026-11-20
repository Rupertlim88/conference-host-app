import type { RelatedTalks } from "@repo/host-contracts";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { When } from "./when";

/** The point of the demo: the conference API's matches for this talk. A failure here never breaks the page. */
export function RelatedPanel({ related, loading, failed }: { related: RelatedTalks | undefined; loading: boolean; failed: boolean }) {
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
      {related?.status === "none" && <p className="text-sm">{t("none")}</p>}
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
