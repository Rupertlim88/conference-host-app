"use client";

import type { OrganiserSessionDetail, SessionList } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/features/connection";
import { Cell, ConsoleTime, Pager, PaperStatus, SessionStatus, Table } from "@/features/console-frame";
import { PageTitle } from "@/features/frame";
import { Button } from "@/features/ui/button";
import { Input } from "@/features/ui/input";
import { placeOf } from "@/features/cards";

/** The organiser's sessions: a search box, then one line a session with its papers counted, 50 a page. */
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
        <Table head={[t("column.number"), t("column.title"), t("column.time"), t("column.room"), t("column.papers"), t("column.status")]}>
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

export interface SessionTimes {
  date: string;
  start: string;
  end: string;
  room: string;
}

const PROBLEM = {
  "incomplete-time": "incompleteTime",
  "end-before-start": "endBeforeStart",
  "outside-meeting": "outsideMeeting",
} as const;
type Problem = keyof typeof PROBLEM;
const isProblem = (message: string | undefined): message is Problem => message !== undefined && message in PROBLEM;

export type SaveOutcome = "saved" | Problem | "failed";

/** A session's date, times in meeting time, and room, with Save session. Empty times leave the session with no
 *  time, or with no end. Says it saved, or why it did not. */
export function SessionFormFields({
  initial,
  busy,
  outcome,
  onSave,
}: {
  initial: SessionTimes;
  busy: boolean;
  outcome: SaveOutcome | null;
  onSave: (times: SessionTimes) => void;
}) {
  const t = useTranslations("organiser.session");
  const c = useTranslations("console");
  const [times, setTimes] = useState(initial);
  const field = (name: keyof SessionTimes, label: string, type: string) => (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <Input type={type} value={times[name]} onChange={(e) => setTimes({ ...times, [name]: e.target.value })} />
    </label>
  );
  return (
    <form
      className="grid max-w-xl gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(times);
      }}
    >
      {field("date", t("date"), "date")}
      {field("start", t("start"), "time")}
      {field("end", t("end"), "time")}
      {field("room", t("room"), "text")}
      <div className="flex items-center gap-3 sm:col-span-4">
        <Button type="submit" disabled={busy}>
          {t("save")}
        </Button>
        {outcome === "saved" && (
          <p role="status" className="text-sm text-green-800">
            {t("saved")}
          </p>
        )}
        {outcome !== null && outcome !== "saved" && (
          <p role="alert" className="text-sm text-destructive">
            {outcome === "failed" ? c("failed") : t(PROBLEM[outcome])}
          </p>
        )}
      </div>
    </form>
  );
}

/** The session form, wired to the backend. A refused change names its problem; a saved one reloads the page. */
export function SessionForm({ sessionId, initial }: { sessionId: string; initial: SessionTimes }) {
  const router = useRouter();
  const change = trpc.organiser.sessions.change.useMutation({ onSuccess: () => router.refresh() });
  const problem = change.error?.message;
  const outcome: SaveOutcome | null = change.isSuccess ? "saved" : change.isError ? (isProblem(problem) ? problem : "failed") : null;
  return (
    <SessionFormFields
      initial={initial}
      busy={change.isPending}
      outcome={outcome}
      onSave={(times) => change.mutate({ id: sessionId, ...times })}
    />
  );
}

