import type { ApiStatus } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";

import { ChangesSummary } from "@/components/console/changes-summary";
import { PageTitle } from "@/components/page-title";
import { MEETING_ZONE } from "@/lib/meeting";

/** The developer console: how the app reaches the conference API, the last send, the changes, and the actions. */
export function DeveloperView({ status, actions }: { status: ApiStatus; actions: React.ReactNode }) {
  const t = useTranslations("developer");
  const c = useTranslations("console");
  const format = useFormatter();
  const run = status.lastRun;
  const at = (iso: string) =>
    format.dateTime(new Date(iso), { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: MEETING_ZONE });
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <dl className="mb-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="font-semibold">{t("address")}</dt>
        <dd className="break-all">{status.apiAddress ?? t("notSet")}</dd>
        <dt className="font-semibold">{t("key")}</dt>
        <dd>{status.keySet ? t("set") : t("notSet")}</dd>
        <dt className="font-semibold">{t("lastSend")}</dt>
        <dd>{run ? t("lastRun", { state: c(`runState.${run.state}`), at: at(run.startedAt) }) : t("noneYet")}</dd>
      </dl>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-heading">{c("changes.title")}</h2>
        <ChangesSummary changes={status.changes} />
      </section>
      {actions}
    </>
  );
}
