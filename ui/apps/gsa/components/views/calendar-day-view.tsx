import type { Day, SessionSummary } from "@repo/host-contracts";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { SessionList } from "@/components/session-list";
import { cn } from "@/lib/utils";

/** Guidebook's schedule: day tabs across the top, then the day's sessions in time order. */
export function CalendarDayView({ date, days, sessions }: { date: string; days: Day[]; sessions: SessionSummary[] }) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  return (
    <>
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => (
          <Link
            key={d.date}
            href={`/calendar/${d.date}`}
            aria-current={d.date === date ? "date" : undefined}
            className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", d.date === date ? "border-primary bg-primary text-primary-foreground" : "bg-white")}
          >
            {format.dateTime(new Date(`${d.date}T12:00:00Z`), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
          </Link>
        ))}
      </nav>
      {sessions.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : <SessionList sessions={sessions} />}
    </>
  );
}
