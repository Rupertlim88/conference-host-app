import type { OrganiserSession, OrganiserTalk, SessionList } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ConsoleTime } from "@/components/console/console-time";
import { SubmissionStatus } from "@/components/console/status-chip";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { placeOf } from "@/lib/place";

/** One submission for the organiser: where and when it is, its withdraw control, and a session search to move it.
 *  `move` draws the move control for one session; the submission's own session gets none. */
export function OrganiserSubmissionView({
  talk,
  sessionQuery,
  sessionResults,
  withdraw,
  move,
}: {
  talk: OrganiserTalk;
  sessionQuery: string;
  sessionResults: SessionList | null;
  withdraw: React.ReactNode;
  move: (session: OrganiserSession) => React.ReactNode;
}) {
  const t = useTranslations("organiser.submission");
  const c = useTranslations("console");
  return (
    <>
      <PageTitle eyebrow={t("eyebrow", { number: talk.number })}>{talk.title}</PageTitle>
      <dl className="mb-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="font-semibold">{t("status")}</dt>
        <dd>
          <SubmissionStatus withdrawn={talk.withdrawn} change={talk.change} />
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
