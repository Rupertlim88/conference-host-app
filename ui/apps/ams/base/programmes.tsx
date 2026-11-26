// Conferences and Symposia lists every track, and each track lists its sessions by day.
import type { SessionSummary, Track, TrackDetail } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

import { MEETING_ZONE } from "@/shared/app";
import { SessionCard } from "@/base/cards";
import { PageTitle } from "@/base/frame";

/** Every conference and symposium of the meeting, each leading to its programme. */
export function ProgramsView({ tracks }: { tracks: Track[] }) {
  const t = useTranslations("programs");
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <ul className="divide-y rounded-md border">
        {tracks.map((track) => (
          <li key={track.id}>
            <Link href={`/programs/${track.id}`} className="block px-4 py-3 text-sm text-primary hover:bg-primary/5">
              {track.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** One conference's programme: its sessions under the day they start on. */
export function ProgramView({ track }: { track: TrackDetail }) {
  const t = useTranslations("programs");
  const format = useFormatter();
  return (
    <>
      <PageTitle eyebrow={t("sessions", { count: track.sessions.length })}>{track.title}</PageTitle>
      {byMeetingDay(track.sessions, MEETING_ZONE).map(({ date, sessions }) => (
        <section key={date ?? "unscheduled"} className="mb-5">
          {date && (
            <h2 className="mb-2 font-semibold text-heading">
              {format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
            </h2>
          )}
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/** Sessions grouped by the day they start on in the meeting's zone, earliest day first; sessions with no time come last. */
export function byMeetingDay(sessions: SessionSummary[], timeZone: string): { date: string | null; sessions: SessionSummary[] }[] {
  const dayOf = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const groups = new Map<string | null, SessionSummary[]>();
  for (const session of sessions) {
    const date = session.startsAt ? dayOf.format(new Date(session.startsAt)) : null;
    groups.set(date, [...(groups.get(date) ?? []), session]);
  }
  return [...groups]
    .map(([date, grouped]) => ({ date, sessions: grouped }))
    .sort((a, b) => (a.date === null ? 1 : b.date === null ? -1 : a.date.localeCompare(b.date)));
}
