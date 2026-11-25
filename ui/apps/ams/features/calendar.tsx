import type { Day, Meeting, SessionSummary } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

import { SessionCard } from "@/features/cards";
import { When } from "@/features/meeting-time";
import { cn } from "@/features/ui/utils";

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

/** The meeting's days across the top of the calendar; the day shown is marked. Days are dates, so they format at noon UTC. */
export function DayStrip({ days, current }: { days: Day[]; current: string }) {
  const format = useFormatter();
  const noon = (date: string) => new Date(`${date}T12:00:00Z`);
  return (
    <nav className="mb-4 flex justify-between gap-1 border-b-2 border-neutral-200 pb-3">
      {days.map(({ date }) => (
        <Link
          key={date}
          href={`/calendar/${date}`}
          aria-current={date === current ? "date" : undefined}
          className="flex flex-1 flex-col items-center text-heading"
        >
          <span className="text-xs uppercase">{format.dateTime(noon(date), { weekday: "short", timeZone: "UTC" })}</span>{" "}
          <span className={cn("mt-0.5 flex size-7 items-center justify-center rounded-full text-xs font-semibold", date === current && "bg-heading text-white")}>
            {format.dateTime(noon(date), { day: "numeric", timeZone: "UTC" })}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export interface TimeBlock {
  startsAt: string;
  endsAt: string | null;
  sessions: SessionSummary[];
}

/** A day's sessions grouped by shared start and end time, earliest first, as the Meeting Calendar shows them. */
export function timeBlocks(sessions: SessionSummary[]): TimeBlock[] {
  const blocks = new Map<string, TimeBlock>();
  for (const s of sessions) {
    if (!s.startsAt) continue;
    const key = `${s.startsAt}|${s.endsAt ?? ""}`;
    const block = blocks.get(key) ?? { startsAt: s.startsAt, endsAt: s.endsAt, sessions: [] };
    block.sessions.push(s);
    blocks.set(key, block);
  }
  return [...blocks.values()].sort(
    (a, b) => a.startsAt.localeCompare(b.startsAt) || (a.endsAt ?? "").localeCompare(b.endsAt ?? ""),
  );
}

/** The day the calendar opens on: the first day with sessions from the meeting's start, else the earliest day with sessions. */
export function firstDay(days: Day[], meeting: Meeting): Day | undefined {
  return days.find((d) => d.date >= meeting.startsOn) ?? days[0];
}
