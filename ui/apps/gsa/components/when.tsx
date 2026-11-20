"use client";

import { useFormatter, type DateTimeFormatOptions } from "next-intl";

import { useZone } from "./time-zone";

const FORMATS = {
  day: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  date: { weekday: "short", month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit" },
} satisfies Record<string, DateTimeFormatOptions>;

/** A meeting time in the chosen zone. day: "Tuesday, January 27, 2026"; date: "Tue, Jan 27"; time: "1:45 PM"; range: "1:45 PM - 2:00 PM". */
export function When({ start, end, mode }: { start: string | null; end?: string | null; mode: "date" | "time" | "range" | "day" }) {
  const format = useFormatter();
  const timeZone = useZone();
  if (!start) return null;
  const at = (iso: string, style: keyof typeof FORMATS) => format.dateTime(new Date(iso), { ...FORMATS[style], timeZone });
  const text = mode !== "range" ? at(start, mode) : end ? `${at(start, "time")} - ${at(end, "time")}` : at(start, "time");
  return <>{text}</>;
}
