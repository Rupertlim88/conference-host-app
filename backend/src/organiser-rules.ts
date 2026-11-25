export interface Placement {
  startsAt: Date | null;
  endsAt: Date | null;
  room: string;
  building: string;
  sort: number;
}

const later = (a: Date, b: Date | null) => (b && b > a ? b : a);

/**
 * Where a talk moved into a session goes. It takes the session's room and building and sorts after the session's
 * last talk. A poster, or a talk with no length, takes the session's times; any other talk keeps its length and
 * starts when the session's last talk ends, never before the session starts.
 */
export function placeInSession(
  talk: { kind: string; startsAt: Date | null; endsAt: Date | null },
  session: { startsAt: Date | null; endsAt: Date | null; room: string; building: string },
  tail: { lastEnd: Date | null; lastSort: number | null },
): Placement {
  const place = { room: session.room, building: session.building, sort: (tail.lastSort ?? 0) + 1 };
  if (!session.startsAt) return { ...place, startsAt: null, endsAt: null };
  const length = talk.startsAt && talk.endsAt ? talk.endsAt.getTime() - talk.startsAt.getTime() : 0;
  if (talk.kind === "poster" || length <= 0) return { ...place, startsAt: session.startsAt, endsAt: session.endsAt };
  const startsAt = later(session.startsAt, tail.lastEnd);
  return { ...place, startsAt, endsAt: new Date(startsAt.getTime() + length) };
}

/** Milliseconds added to each talk when a session's start moves; null when the session had no start or now has
 *  none, and its talks keep their times. */
export function sessionShift(oldStart: Date | null, newStart: Date | null): number | null {
  return oldStart && newStart ? newStart.getTime() - oldStart.getTime() : null;
}

export type SessionTimesProblem = "incomplete-time" | "end-before-start" | "outside-meeting";

const DAY = 86_400_000;
const dayNumber = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`) / DAY;

/**
 * Why new session times cannot be saved, or null when they can. All three empty means no time, and an empty end
 * means no end. A date and a start go together, and an end needs both. The end must come after the start, and the
 * day may be at most a day outside `span`: the meeting's days, widened to the published programme's.
 */
export function sessionTimesProblem(
  span: { startsOn: string; endsOn: string },
  times: { date: string; start: string; end: string },
): SessionTimesProblem | null {
  if ((times.date === "") !== (times.start === "") || (times.end !== "" && times.start === "")) return "incomplete-time";
  if (times.date === "") return null;
  if (times.end !== "" && times.end <= times.start) return "end-before-start";
  const day = dayNumber(times.date);
  if (day < dayNumber(span.startsOn) - 1 || day > dayNumber(span.endsOn) + 1) return "outside-meeting";
  return null;
}
