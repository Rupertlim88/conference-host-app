import type { TrackDetail } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";
import { SessionCard } from "@/components/session-card";
import { byMeetingDay } from "@/lib/days";
import { MEETING_ZONE } from "@/lib/meeting";

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
