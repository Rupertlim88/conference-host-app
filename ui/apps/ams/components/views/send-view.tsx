import type { Changes, SyncRun } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";

import { ChangesSummary } from "@/components/console/changes-summary";
import { ConsoleTime } from "@/components/console/console-time";
import { Cell, Table } from "@/components/console/table";
import { PageTitle } from "@/components/page-title";

/** The send page: what changed since the published programme, the send control, and the last ten sends. */
export function SendView({ changes, runs, send }: { changes: Changes; runs: SyncRun[]; send: React.ReactNode }) {
  const t = useTranslations("organiser.sendPage");
  const c = useTranslations("console");
  const format = useFormatter();
  return (
    <>
      <PageTitle>{useTranslations("organiser")("send")}</PageTitle>
      <p className="mb-4 max-w-2xl text-sm">{t("intro")}</p>
      <section className="mb-4">
        <h2 className="mb-2 text-lg font-semibold text-heading">{c("changes.title")}</h2>
        <ChangesSummary changes={changes} />
      </section>
      <div className="mb-6">{send}</div>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-heading">{t("runs")}</h2>
        {runs.length === 0 ? (
          <p className="text-sm">{t("noRuns")}</p>
        ) : (
          <Table
            head={[t("column.started"), t("column.result"), t("column.sent"), t("column.added"), t("column.changed"), t("column.withdrawn"), t("column.note")]}
          >
            {runs.map((run) => (
              <tr key={run.id}>
                <Cell className="whitespace-nowrap">
                  <ConsoleTime start={run.startedAt} />
                </Cell>
                <Cell>{c(`runState.${run.state}`)}</Cell>
                <Cell>{format.number(run.sent)}</Cell>
                <Cell>{format.number(run.added)}</Cell>
                <Cell>{format.number(run.changed)}</Cell>
                <Cell>{format.number(run.withdrawn)}</Cell>
                <Cell>{run.error}</Cell>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
