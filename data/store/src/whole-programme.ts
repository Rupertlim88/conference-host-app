// The store keeps AMS's whole published programme beside the talks the demo holds.
import { asc, sql } from "drizzle-orm";

import type { Db } from "./connect";
import type { SocietyRows, Tx } from "./load";
import { SOCIETY_TABLES, type Society, type SocietyTables } from "./tables";
import { zonedDateTime } from "./time";

const CHUNK = 500;

async function insertAll(tx: Tx, table: Parameters<Tx["insert"]>[0], rows: object[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) await tx.insert(table).values(rows.slice(i, i + CHUNK) as never);
}

/** Writes every talk AMS publishes, with its people, in place of what was there. The load runs it inside its own
 *  transaction, so the whole programme always matches the files the demo was loaded from. */
export async function writeWholeProgramme(tx: Tx, t: SocietyTables, rows: SocietyRows): Promise<void> {
  await tx.delete(t.wholeTalks);
  await tx.delete(t.wholePeople);
  await insertAll(tx, t.wholeTalks, rows.talks);
  await insertAll(tx, t.wholePeople, rows.people);
  await insertAll(tx, t.wholeTalkPeople, rows.talkPeople);
}

/** A talk of the whole programme, with what a test set and the programme map need to know of it. */
export interface WholeTalk {
  id: string;
  sessionId: string | null;
  kind: string;
  hasAbstract: boolean;
  trackIds: string[];
  sort: number;
}

/** A session as published: its start on the meeting's clock, with its offset (2027-01-11T08:30:00-07:00). */
export interface WholeSession {
  id: string;
  start: string | null;
  trackIds: string[];
}

export interface WholeProgramme {
  talks: WholeTalk[];
  sessions: WholeSession[];
  /** Every conference, in AMS's order. */
  tracks: { id: string; title: string }[];
}

export function createWholeProgramme(db: Db, society: Society) {
  const t = SOCIETY_TABLES[society];
  return {
    /** Every talk AMS publishes, every session at its published start, and every conference. */
    async contents(): Promise<WholeProgramme> {
      const [talks, sessions, tracks, [meeting]] = await Promise.all([
        db
          .select({
            id: t.wholeTalks.id,
            sessionId: t.wholeTalks.sessionId,
            kind: t.wholeTalks.kind,
            hasAbstract: sql<boolean>`trim(${t.wholeTalks.abstract}) <> ''`,
            trackIds: t.wholeTalks.trackIds,
            sort: t.wholeTalks.sort,
          })
          .from(t.wholeTalks)
          .orderBy(asc(t.wholeTalks.id)),
        db
          .select({ id: t.sessions.id, startsAt: t.sessions.pubStartsAt, trackIds: t.sessions.trackIds })
          .from(t.sessions)
          .orderBy(asc(t.sessions.id)),
        db.select({ id: t.tracks.id, title: t.tracks.title }).from(t.tracks).orderBy(asc(t.tracks.sort)),
        db.select({ timeZone: t.meeting.timeZone }).from(t.meeting).limit(1),
      ]);
      const zone = meeting?.timeZone ?? "UTC";
      return {
        talks,
        sessions: sessions.map((s) => ({ id: s.id, start: s.startsAt ? zonedDateTime(s.startsAt, zone) : null, trackIds: s.trackIds })),
        tracks,
      };
    },
  };
}

export type WholeProgrammeStore = ReturnType<typeof createWholeProgramme>;
