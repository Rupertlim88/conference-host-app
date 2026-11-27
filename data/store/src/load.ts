// Loading puts back the published programme in one step, and keeps stars, notes and sign-ins.
import { getTableColumns, notInArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import type { Db } from "./connect";
import { amsRows } from "./ams-rows";
import type { SocietyTables } from "./tables";
import { sampleTalkIds } from "./sample";
import { holdTalks } from "./test-set";
import { writeWholeProgramme } from "./whole-programme";

export type MeetingRow = Omit<SocietyTables["meeting"]["$inferSelect"], "id">;
export type TrackRow = SocietyTables["tracks"]["$inferSelect"];
type PublishedSession = "pubStartsAt" | "pubEndsAt" | "pubRoom" | "pubBuilding";
type PublishedTalk = PublishedSession | "pubSessionId" | "pubSort";
/** A session as a programme file gives it; the loader records it as published too. */
export type SessionRow = Omit<SocietyTables["sessions"]["$inferSelect"], PublishedSession>;
export type TalkKind = "oral" | "poster" | "break";
/** A talk as a programme file gives it; the loader records it as published too, and never withdrawn. */
export type TalkRow = Omit<SocietyTables["talks"]["$inferSelect"], PublishedTalk | "withdrawn"> & { kind: TalkKind };
export type PersonRow = SocietyTables["people"]["$inferSelect"];
export type TalkPersonRow = SocietyTables["talkPeople"]["$inferSelect"];
export type InfoListRow = SocietyTables["infoLists"]["$inferSelect"];

/** Everything one society's programme loads into the store. */
export interface SocietyRows {
  meeting: MeetingRow;
  tracks: TrackRow[];
  sessions: SessionRow[];
  talks: TalkRow[];
  people: PersonRow[];
  talkPeople: TalkPersonRow[];
  infoLists: InfoListRow[];
}


export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
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

export interface LoadCounts {
  tracks: number;
  sessions: number;
  talks: number;
  people: number;
}

/** Loads AMS's files as published: maps them to the host app's programme and writes it, the demo holding their sample
 *  until a test set arrives. Gives what the demo holds, and how many talks AMS publishes. */
export async function loadAms(db: Db, t: SocietyTables, files: unknown): Promise<LoadCounts & { published: number }> {
  const rows = amsRows(files);
  return { ...(await loadRows(db, t, rows, sampleTalkIds(rows))), published: rows.talks.length };
}

/** Writes one society's whole programme in a single transaction: the meeting, every track and session as both live
 *  and published, and every talk with its people as AMS's whole programme. The demo then holds the latest test set's
 *  talks, or, until one arrives, the sample's, as published and none withdrawn. Rows not in `rows` are deleted, so a
 *  rerun leaves the same store and undoes organiser edits. The loader is the only writer of the published columns. */
export async function loadRows(db: Db, t: SocietyTables, rows: SocietyRows, sample: string[] = rows.talks.map((r) => r.id)): Promise<LoadCounts> {
  await db.transaction(async (tx) => {
    await tx
      .insert(t.meeting)
      .values({ id: 1, ...rows.meeting })
      .onConflictDoUpdate({ target: t.meeting.id, set: rows.meeting });
    await upsert(tx, t.tracks, t.tracks.id, rows.tracks);
    await upsert(tx, t.sessions, t.sessions.id, rows.sessions.map(published));
    await writeWholeProgramme(tx, t, rows);

    await tx.delete(t.infoLists);
    if (rows.infoLists.length) await tx.insert(t.infoLists).values(rows.infoLists);

    const [latest] = await tx.select({ talks: t.testSet.talks }).from(t.testSet);
    await holdTalks(tx, t, latest?.talks ?? sample);

    const keep = (ids: string[]) => (ids.length ? ids : ["\u0000"]);
    await tx.delete(t.sessions).where(notInArray(t.sessions.id, keep(rows.sessions.map((r) => r.id))));
    await tx.delete(t.tracks).where(notInArray(t.tracks.id, keep(rows.tracks.map((r) => r.id))));
  });

  return {
    tracks: await db.$count(t.tracks),
    sessions: await db.$count(t.sessions),
    talks: await db.$count(t.talks),
    people: await db.$count(t.people),
  };
}
