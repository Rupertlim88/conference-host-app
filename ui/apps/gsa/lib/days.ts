import type { Day, Meeting, SessionSummary } from "@repo/host-contracts";

/** The day the calendar opens on: the first day with sessions from the meeting's start, else the earliest day with sessions. */
export function firstDay(days: Day[], meeting: Meeting): Day | undefined {
  return days.find((d) => d.date >= meeting.startsOn) ?? days[0];
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
