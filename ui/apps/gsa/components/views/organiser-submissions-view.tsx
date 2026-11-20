import { TalkStatusFilterSchema, type TalkList, type TalkStatusFilter } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ConsoleTime } from "@/components/console/console-time";
import { Pager } from "@/components/console/pager";
import { SubmissionStatus } from "@/components/console/status-chip";
import { Cell, Table } from "@/components/console/table";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The organiser's submissions: a search box and status filter (a plain GET form), then one line a submission, 50 a page. */
export function OrganiserSubmissionsView({ list, q, status }: { list: TalkList; q: string; status: TalkStatusFilter }) {
  const t = useTranslations("organiser");
  const href = (page: number) => `/organiser?${new URLSearchParams({ q, status, page: String(page) })}`;
  return (
    <>
      <PageTitle>{t("submissions")}</PageTitle>
      <form action="/organiser" className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          {t("searchSubmissions")}
          <Input type="search" name="q" defaultValue={q} className="w-64" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("status")}
          <select name="status" defaultValue={status} className="h-8 rounded-lg border bg-white px-2 text-sm">
            {TalkStatusFilterSchema.options.map((option) => (
              <option key={option} value={option}>
                {t(`filter.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">{t("search")}</Button>
      </form>
      <p className="mb-2 text-sm text-muted-foreground">{t("submissionCount", { total: list.total })}</p>
      {list.talks.length === 0 ? (
        <p className="text-sm">{t("noSubmissions")}</p>
      ) : (
        <Table head={[t("column.number"), t("column.title"), t("column.presenter"), t("column.session"), t("column.time"), t("column.status")]}>
          {list.talks.map((talk) => (
            <tr key={talk.id}>
              <Cell className="whitespace-nowrap">{talk.number}</Cell>
              <Cell>
                <Link href={`/organiser/talks/${talk.id}`} className="text-primary underline">
                  {talk.title}
                </Link>
              </Cell>
              <Cell>{talk.presentingAuthor}</Cell>
              <Cell className="whitespace-nowrap">{talk.sessionNumber}</Cell>
              <Cell className="whitespace-nowrap">
                <ConsoleTime start={talk.startsAt} end={talk.endsAt} />
              </Cell>
              <Cell>
                <SubmissionStatus withdrawn={talk.withdrawn} change={talk.change} />
              </Cell>
            </tr>
          ))}
        </Table>
      )}
      <Pager page={list.page} total={list.total} href={href} />
    </>
  );
}
