// While a page loads, the app shows at once that it is loading.
import { useTranslations } from "next-intl";

import { Skeleton } from "@/shared/ui/skeleton";

/** In place of a page still on its way: a heading's and a few lines' shapes, and "Loading…" for a screen reader. */
export function PageLoading() {
  const t = useTranslations("errors");
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="mx-auto h-7 w-2/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
