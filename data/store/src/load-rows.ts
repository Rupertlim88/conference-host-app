import { getTableColumns, notInArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import type { Db } from "./db";
import type { SessionRow, SocietyRows, TalkRow } from "./rows";
import type { SocietyTables } from "./schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
const CHUNK = 500;

/** Every column set from the incoming row on conflict. Column names come from our schema, never from data. */
function fromIncoming(table: PgTable): Record<string, SQL> {
  return Object.fromEntries(
    Object.entries(getTableColumns(table)).map(([key, col]) => [key, sql.raw(`excluded."${col.name}"`)]),
  );
}

async function upsert(tx: Tx, table: PgTable, key: PgColumn, rows: object[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await tx
      .insert(table)
      .values(rows.slice(i, i + CHUNK) as never)
      .onConflictDoUpdate({ target: key, set: fromIncoming(table) as never });
  }
}

/** The loaded time and place, as both the live programme and the published one. */
type Placed = Pick<SessionRow, "startsAt" | "endsAt" | "room" | "building">;
const published = <R extends Placed>(r: R) => ({
  ...r,
  pubStartsAt: r.startsAt,
  pubEndsAt: r.endsAt,
  pubRoom: r.room,
  pubBuilding: r.building,
});
const publishedTalk = (r: TalkRow) => ({ ...published(r), pubSessionId: r.sessionId, pubSort: r.sort, withdrawn: false });

export interface LoadCounts {
  tracks: number;
  sessions: number;
  talks: number;
  people: number;
}

/** Writes one society's programme in a single transaction, as both live and published, with no talk withdrawn.
 *  Rows not in `rows` are deleted, so a rerun leaves the same store and undoes organiser edits. The loader is the
 *  only writer of the published columns. */
export async function loadRows(db: Db, t: SocietyTables, rows: SocietyRows): Promise<LoadCounts> {
  await db.transaction(async (tx) => {
    await tx
      .insert(t.meeting)
      .values({ id: 1, ...rows.meeting })
      .onConflictDoUpdate({ target: t.meeting.id, set: rows.meeting });
    await upsert(tx, t.tracks, t.tracks.id, rows.tracks);
    await upsert(tx, t.sessions, t.sessions.id, rows.sessions.map(published));
    await upsert(tx, t.talks, t.talks.id, rows.talks.map(publishedTalk));
    await upsert(tx, t.people, t.people.id, rows.people);

    await tx.delete(t.talkPeople);
    for (let i = 0; i < rows.talkPeople.length; i += CHUNK) {
      await tx.insert(t.talkPeople).values(rows.talkPeople.slice(i, i + CHUNK));
    }

    const keep = (ids: string[]) => (ids.length ? ids : ["\u0000"]);
    await tx.delete(t.talks).where(notInArray(t.talks.id, keep(rows.talks.map((r) => r.id))));
    await tx.delete(t.sessions).where(notInArray(t.sessions.id, keep(rows.sessions.map((r) => r.id))));
    await tx.delete(t.people).where(notInArray(t.people.id, keep(rows.people.map((r) => r.id))));
    await tx.delete(t.tracks).where(notInArray(t.tracks.id, keep(rows.tracks.map((r) => r.id))));
  });

  return {
    tracks: await db.$count(t.tracks),
    sessions: await db.$count(t.sessions),
    talks: await db.$count(t.talks),
    people: await db.$count(t.people),
  };
}
