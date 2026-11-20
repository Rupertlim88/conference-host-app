import type { SessionList } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ConsoleTime } from "@/components/console/console-time";
import { Pager } from "@/components/console/pager";
import { SessionStatus } from "@/components/console/status-chip";
import { Cell, Table } from "@/components/console/table";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The organiser's sessions: a search box, then one line a session with its submissions counted, 50 a page. */
export function OrganiserSessionsView({ list, q }: { list: SessionList; q: string }) {
  const t = useTranslations("organiser");
  const href = (page: number) => `/organiser/sessions?${new URLSearchParams({ q, page: String(page) })}`;
  return (
    <>
      <PageTitle>{t("sessions")}</PageTitle>
      <form action="/organiser/sessions" className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          {t("searchSessions")}
          <Input type="search" name="q" defaultValue={q} className="w-64" />
        </label>
        <Button type="submit">{t("search")}</Button>
      </form>
      <p className="mb-2 text-sm text-muted-foreground">{t("sessionCount", { total: list.total })}</p>
      {list.sessions.length === 0 ? (
        <p className="text-sm">{t("noSessions")}</p>
      ) : (
        <Table head={[t("column.number"), t("column.title"), t("column.time"), t("column.room"), t("column.submissions"), t("column.status")]}>
          {list.sessions.map((session) => (
            <tr key={session.id}>
              <Cell className="whitespace-nowrap">{session.number}</Cell>
              <Cell>
                <Link href={`/organiser/sessions/${session.id}`} className="text-primary underline">
                  {session.title}
                </Link>
              </Cell>
              <Cell className="whitespace-nowrap">
                <ConsoleTime start={session.startsAt} end={session.endsAt} />
              </Cell>
              <Cell>{session.room}</Cell>
              <Cell>{session.talks}</Cell>
              <Cell>
                <SessionStatus changed={session.changed} />
              </Cell>
            </tr>
          ))}
        </Table>
      )}
      <Pager page={list.page} total={list.total} href={href} />
    </>
  );
}
