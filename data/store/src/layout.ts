// Where each held talk sits follows the latest test set's layout when it has one, and AMS's placement otherwise.
import type { Layout } from "@repo/host-contracts";
import { asc, eq, inArray } from "drizzle-orm";

import type { Db } from "./connect";
import type { SocietyTables } from "./tables";
import { zonedInstant } from "./time";

/** Where one talk sits: its session, or none, and its conferences. */
export interface SeatedTalk {
  id: string;
  sessionId: string | null;
  trackIds: string[];
}

/** Every held talk where it sits, and every session that holds one, at its start there, with its talks in order and
 *  its conferences: AMS's for its session, or, in a layout, those its talks sit in. */
export interface Seating {
  laidOut: boolean;
  talks: SeatedTalk[];
  sessions: { id: string; startsAt: string | null; talks: string[]; trackIds: string[] }[];
}

/** Where the layout seats one talk: its session and that session's start in the layout, and its conferences. */
export interface Seat {
  sessionId: string | null;
  start: Date | null;
  trackIds: string[];
}

/** The latest test set's layout, or null when there is none. */
export async function latestLayout(db: Db, t: SocietyTables): Promise<Layout | null> {
  const [row] = await db.select({ layout: t.testSet.layout }).from(t.testSet);
  return row?.layout ?? null;
}

/** A layout's time on the meeting's clock (2027-01-11T08:30) as the instant it names. */
const instantOf = (minute: string, timeZone: string) => zonedInstant(minute.slice(0, 10), minute.slice(11, 16), timeZone);

/** The seat of each talk the layout places; a talk it places nowhere has none. */
export function seatsOf(layout: Layout, timeZone: string): Map<string, Seat> {
  const seats = new Map<string, Seat>();
  const seatOf = (id: string) => {
    const seat = seats.get(id) ?? { sessionId: null, start: null, trackIds: [] };
    seats.set(id, seat);
    return seat;
  };
  for (const session of layout.sessions) {
    for (const id of session.talks) Object.assign(seatOf(id), { sessionId: session.id, start: instantOf(session.start, timeZone) });
  }
  for (const conference of layout.conferences) for (const id of conference.talks) seatOf(id).trackIds.push(conference.trackId);
  return seats;
}

/** Where every held talk sits: as the latest test set's layout says, or, without one, where AMS placed it. */
export async function seating(db: Db, t: SocietyTables, timeZone: string): Promise<Seating> {
  const shown = eq(t.talks.withdrawn, false);
  const [talks, layout] = await Promise.all([
    db
      .select({ id: t.talks.id, sessionId: t.talks.sessionId, trackIds: t.talks.trackIds })
      .from(t.talks)
      .where(shown)
      .orderBy(asc(t.talks.startsAt), asc(t.talks.sort), asc(t.talks.number)),
    latestLayout(db, t),
  ]);
  if (layout) {
    const seats = seatsOf(layout, timeZone);
    const held = new Set(talks.map((talk) => talk.id));
    return {
      laidOut: true,
      talks: talks.map(({ id }) => ({ id, sessionId: seats.get(id)?.sessionId ?? null, trackIds: seats.get(id)?.trackIds ?? [] })),
      sessions: layout.sessions.map((s) => ({
        id: s.id,
        startsAt: instantOf(s.start, timeZone).toISOString(),
        talks: s.talks.filter((id) => held.has(id)),
        trackIds: [...new Set(s.talks.flatMap((id) => seats.get(id)?.trackIds ?? []))],
      })),
    };
  }
  const sessionIds = [...new Set(talks.flatMap((talk) => (talk.sessionId ? [talk.sessionId] : [])))];
  const starts = sessionIds.length
    ? await db
        .select({ id: t.sessions.id, startsAt: t.sessions.startsAt, trackIds: t.sessions.trackIds })
        .from(t.sessions)
        .where(inArray(t.sessions.id, sessionIds))
    : [];
  return {
    laidOut: false,
    talks,
    sessions: starts.map((s) => ({
      id: s.id,
      startsAt: s.startsAt?.toISOString() ?? null,
      talks: talks.filter((talk) => talk.sessionId === s.id).map((talk) => talk.id),
      trackIds: s.trackIds,
    })),
  };
}
