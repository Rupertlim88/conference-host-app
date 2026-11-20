import type { OrganiserSessionDetail } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ConsoleTime } from "@/components/console/console-time";
import { PaperStatus, SessionStatus } from "@/components/console/status-chip";
import { Cell, Table } from "@/components/console/table";
import { PageTitle } from "@/components/page-title";
import { placeOf } from "@/lib/place";

/** One session for the organiser: its time and room, the form that changes them, and every paper in it,
 *  withdrawn ones included. */
export function OrganiserSessionView({ session, form }: { session: OrganiserSessionDetail; form: React.ReactNode }) {
  const t = useTranslations("organiser.session");
  const o = useTranslations("organiser");
  const c = useTranslations("console");
  return (
    <>
      <PageTitle eyebrow={t("eyebrow", { number: session.number })}>{session.title}</PageTitle>
      <dl className="mb-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="font-semibold">{t("status")}</dt>
        <dd>
          <SessionStatus changed={session.changed} />
        </dd>
        <dt className="font-semibold">{t("time")}</dt>
        <dd>
          <ConsoleTime start={session.startsAt} end={session.endsAt} />
        </dd>
        <dt className="font-semibold">{t("room")}</dt>
        <dd>{placeOf(session.room, session.building)}</dd>
      </dl>
      <Link href={`/sessions/${session.id}`} className="mb-6 inline-block text-sm text-primary underline">
        {c("viewAttendee")}
      </Link>
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-heading">{t("edit")}</h2>
        {form}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-heading">{t("papers")}</h2>
        <Table head={[o("column.number"), o("column.title"), o("column.time"), o("column.status")]}>
          {session.talks.map((talk) => (
            <tr key={talk.id}>
              <Cell className="whitespace-nowrap">{talk.number}</Cell>
              <Cell>
                <Link href={`/organiser/talks/${talk.id}`} className="text-primary underline">
                  {talk.title}
                </Link>
              </Cell>
              <Cell className="whitespace-nowrap">
                <ConsoleTime start={talk.startsAt} end={talk.endsAt} />
              </Cell>
              <Cell>
                <PaperStatus withdrawn={talk.withdrawn} change={talk.change} />
              </Cell>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}
