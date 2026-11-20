import type { Day } from "@repo/host-contracts";
import Link from "next/link";
import { useFormatter } from "next-intl";

import { cn } from "@/lib/utils";

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
