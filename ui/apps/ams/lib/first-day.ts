import type { Day, Meeting } from "@repo/host-contracts";

/** The day the calendar opens on: the first day with sessions from the meeting's start, else the earliest day with sessions. */
export function firstDay(days: Day[], meeting: Meeting): Day | undefined {
  return days.find((d) => d.date >= meeting.startsOn) ?? days[0];
}
