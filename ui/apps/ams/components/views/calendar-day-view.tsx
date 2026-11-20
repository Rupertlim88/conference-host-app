import type { Day, SessionSummary } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";

import { DayStrip } from "@/components/day-strip";
import { SessionCard } from "@/components/session-card";
import { When } from "@/components/when";
import { timeBlocks } from "@/lib/blocks";

/** One day of the Meeting Calendar: the day, the meeting's days, and the day's sessions grouped by time. */
export function CalendarDayView({ date, days, sessions }: { date: string; days: Day[]; sessions: SessionSummary[] }) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const blocks = timeBlocks(sessions);
  return (
    <>
      <h1 className="text-center text-lg text-heading">{format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</h1>
      <DayStrip days={days} current={date} />
      {blocks.length === 0 && <p className="text-center text-sm text-muted-foreground">{t("empty")}</p>}
      {blocks.map((block) => (
        <section key={`${block.startsAt}-${block.endsAt}`} className="mb-5">
          <h2 className="mb-2 text-center font-semibold text-heading">
            <When start={block.startsAt} end={block.endsAt} mode="range" />
          </h2>
          <div className="space-y-2">
            {block.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
