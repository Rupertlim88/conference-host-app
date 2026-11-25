"use client";

// Organisers find any paper, withdraw or restore it, and move it to another session.

import { type OrganiserSession, type OrganiserTalk, type SessionList, type TalkList, type TalkStatusFilter, TalkStatusFilterSchema } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/features/connection";
import { Cell, ConsoleTime, Pager, PaperStatus, Table } from "@/features/console-frame";
import { PageTitle } from "@/features/frame";
import { Button } from "@/features/ui/button";
import { Input } from "@/features/ui/input";
import { placeOf } from "@/features/cards";

/** The organiser's papers: a search box and status filter (a plain GET form), then one line a paper, 50 a page. */
export function OrganiserPapersView({ list, q, status }: { list: TalkList; q: string; status: TalkStatusFilter }) {
  const t = useTranslations("organiser");
  const href = (page: number) => `/organiser?${new URLSearchParams({ q, status, page: String(page) })}`;
  return (
    <>
      <PageTitle>{t("papers")}</PageTitle>
      <form action="/organiser" className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          {t("searchPapers")}
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
      <p className="mb-2 text-sm text-muted-foreground">{t("paperCount", { total: list.total })}</p>
      {list.talks.length === 0 ? (
        <p className="text-sm">{t("noPapers")}</p>
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
                <PaperStatus withdrawn={talk.withdrawn} change={talk.change} />
              </Cell>
            </tr>
          ))}
        </Table>
      )}
      <Pager page={list.page} total={list.total} href={href} />
    </>
  );
}

/** One paper for the organiser: where and when it is, its withdraw control, and a session search to move it.
 *  `move` draws the move control for one session; the paper's own session gets none. Both controls default to the
 *  ones wired to the backend; a test may pass its own. */
export function OrganiserPaperView({
  talk,
  sessionQuery,
  sessionResults,
  withdraw = <WithdrawButton talkId={talk.id} withdrawn={talk.withdrawn} />,
  move = (session) => <MoveButton talkId={talk.id} session={{ id: session.id, number: session.number }} />,
}: {
  talk: OrganiserTalk;
  sessionQuery: string;
  sessionResults: SessionList | null;
  withdraw?: React.ReactNode;
  move?: (session: OrganiserSession) => React.ReactNode;
}) {
  const t = useTranslations("organiser.paper");
  const c = useTranslations("console");
  return (
    <>
      <PageTitle eyebrow={t("eyebrow", { number: talk.number })}>{talk.title}</PageTitle>
      <dl className="mb-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="font-semibold">{t("status")}</dt>
        <dd>
          <PaperStatus withdrawn={talk.withdrawn} change={talk.change} />
        </dd>
        <dt className="font-semibold">{t("presenter")}</dt>
        <dd>{talk.presentingAuthor}</dd>
        <dt className="font-semibold">{t("session")}</dt>
        <dd>
          {talk.sessionId ? (
            <Link href={`/organiser/sessions/${talk.sessionId}`} className="text-primary underline">
              {`${talk.sessionNumber} - ${talk.sessionTitle}`}
            </Link>
          ) : (
            t("noSession")
          )}
        </dd>
        <dt className="font-semibold">{t("time")}</dt>
        <dd>
          <ConsoleTime start={talk.startsAt} end={talk.endsAt} />
        </dd>
        <dt className="font-semibold">{t("room")}</dt>
        <dd>{placeOf(talk.room, talk.building)}</dd>
      </dl>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {withdraw}
        {!talk.withdrawn && (
          <Link href={`/talks/${talk.id}`} className="text-sm text-primary underline">
            {c("viewAttendee")}
          </Link>
        )}
      </div>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-heading">{t("move")}</h2>
        <form action={`/organiser/talks/${talk.id}`} className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t("findSession")}
            <Input type="search" name="sq" defaultValue={sessionQuery} className="w-64" />
          </label>
          <Button type="submit" variant="outline">
            {t("find")}
          </Button>
        </form>
        {sessionResults && sessionResults.sessions.length === 0 && <p className="text-sm">{c("noSessionsMatch")}</p>}
        {sessionResults && sessionResults.sessions.length > 0 && (
          <ul className="divide-y rounded border bg-white text-sm">
            {sessionResults.sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5">
                <span>
                  <span className="font-semibold">{session.number}</span> {session.title}
                  {", "}
                  <ConsoleTime start={session.startsAt} end={session.endsAt} />
                </span>
                {session.id === talk.sessionId ? <span className="text-muted-foreground">{t("here")}</span> : move(session)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** Withdraws a shown paper or restores a withdrawn one. It cannot be pressed while a change saves. */
export function WithdrawControl({
  withdrawn,
  busy,
  failed,
  onWithdraw,
  onRestore,
}: {
  withdrawn: boolean;
  busy: boolean;
  failed: boolean;
  onWithdraw: () => void;
  onRestore: () => void;
}) {
  const t = useTranslations("organiser.paper");
  const c = useTranslations("console");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant={withdrawn ? "default" : "destructive"} disabled={busy} onClick={withdrawn ? onRestore : onWithdraw}>
        {withdrawn ? t("restore") : t("withdraw")}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {c("failed")}
        </p>
      )}
    </div>
  );
}

/** The withdraw control, wired to the backend. Once a change saves, the button shows the new state at once, and the
 *  page reloads its data. */
export function WithdrawButton({ talkId, withdrawn }: { talkId: string; withdrawn: boolean }) {
  const router = useRouter();
  // The saved state shows at once; when the page's own data changes, the button follows it again.
  const [saved, setSaved] = useState(withdrawn);
  const [lastProp, setLastProp] = useState(withdrawn);
  if (lastProp !== withdrawn) {
    setLastProp(withdrawn);
    setSaved(withdrawn);
  }
  const done = (now: boolean) => ({
    onSuccess: () => {
      setSaved(now);
      router.refresh();
    },
  });
  const withdraw = trpc.organiser.talks.withdraw.useMutation(done(true));
  const restore = trpc.organiser.talks.restore.useMutation(done(false));
  return (
    <WithdrawControl
      withdrawn={saved}
      busy={withdraw.isPending || restore.isPending}
      failed={withdraw.isError || restore.isError}
      onWithdraw={() => withdraw.mutate({ id: talkId })}
      onRestore={() => restore.mutate({ id: talkId })}
    />
  );
}

/** Moves a paper into the named session. */
export function MoveControl({ number, busy, failed, onMove }: { number: string; busy: boolean; failed: boolean; onMove: () => void }) {
  const t = useTranslations("organiser.paper");
  const c = useTranslations("console");
  return (
    <span className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onMove}>
        {t("moveTo", { number })}
      </Button>
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          {c("failed")}
        </span>
      )}
    </span>
  );
}

/** The move control, wired to the backend. Once moved, the paper's page shows it in its new session. */
export function MoveButton({ talkId, session }: { talkId: string; session: { id: string; number: string } }) {
  const router = useRouter();
  const move = trpc.organiser.talks.move.useMutation({
    onSuccess: () => {
      router.replace(`/organiser/talks/${talkId}`);
      router.refresh();
    },
  });
  return (
    <MoveControl
      number={session.number}
      busy={move.isPending}
      failed={move.isError}
      onMove={() => move.mutate({ id: talkId, sessionId: session.id })}
    />
  );
}
