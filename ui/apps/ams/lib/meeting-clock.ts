/** An instant as the meeting's clocks show it: date YYYY-MM-DD and time HH:MM on the 24-hour clock. Null for none. */
export function meetingClock(iso: string | null, timeZone: string): { date: string; time: string } | null {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}
