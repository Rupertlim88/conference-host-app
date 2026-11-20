import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const textArray = (name: string) =>
  text(name)
    .array()
    .notNull()
    .default(sql`'{}'::text[]`);
const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** The same tables in one Postgres schema per society, so each society's data stays apart. */
function societyTables(schemaName: string) {
  const schema = pgSchema(schemaName);

  const meeting = schema.table("meeting", {
    id: smallint("id").primaryKey().default(1),
    name: text("name").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    timeZone: text("time_zone").notNull(),
    venue: text("venue").notNull(),
    city: text("city").notNull(),
    about: text("about").notNull().default(""),
  });

  const tracks = schema.table("tracks", {
    id: text("id").primaryKey(),
    code: text("code").notNull().default(""),
    title: text("title").notNull(),
    sort: integer("sort").notNull(),
  });

  const sessions = schema.table(
    "sessions",
    {
      id: text("id").primaryKey(),
      number: text("number").notNull().default(""),
      title: text("title").notNull(),
      kind: text("kind").notNull().default(""),
      format: text("format").notNull().default(""),
      description: text("description").notNull().default(""),
      chairs: text("chairs").notNull().default(""),
      startsAt: instant("starts_at"),
      endsAt: instant("ends_at"),
      room: text("room").notNull().default(""),
      building: text("building").notNull().default(""),
      trackIds: textArray("track_ids"),
      // The published programme's time and place, written only by the loader. Organiser edits change the
      // columns above; a reset copies these back.
      pubStartsAt: instant("pub_starts_at"),
      pubEndsAt: instant("pub_ends_at"),
      pubRoom: text("pub_room").notNull().default(""),
      pubBuilding: text("pub_building").notNull().default(""),
    },
    (t) => [index().on(t.startsAt)],
  );

  const talks = schema.table(
    "talks",
    {
      id: text("id").primaryKey(),
      sessionId: text("session_id").references(() => sessions.id),
      number: text("number").notNull().default(""),
      title: text("title").notNull(),
      abstract: text("abstract").notNull().default(""),
      kind: text("kind").notNull(),
      startsAt: instant("starts_at"),
      endsAt: instant("ends_at"),
      room: text("room").notNull().default(""),
      building: text("building").notNull().default(""),
      booth: text("booth").notNull().default(""),
      presentingAuthor: text("presenting_author").notNull().default(""),
      authorLine: text("author_line").notNull().default(""),
      affiliations: textArray("affiliations"),
      doi: text("doi").notNull().default(""),
      citation: text("citation").notNull().default(""),
      trackIds: textArray("track_ids"),
      sort: integer("sort").notNull().default(0),
      /** Taken out of the programme by an organiser: every attendee read leaves it out. */
      withdrawn: boolean("withdrawn").notNull().default(false),
      // The published programme's session, time, place and order, written only by the loader.
      pubSessionId: text("pub_session_id"),
      pubStartsAt: instant("pub_starts_at"),
      pubEndsAt: instant("pub_ends_at"),
      pubRoom: text("pub_room").notNull().default(""),
      pubBuilding: text("pub_building").notNull().default(""),
      pubSort: integer("pub_sort").notNull().default(0),
    },
    (t) => [index().on(t.sessionId), index().on(t.startsAt)],
  );

  const people = schema.table("people", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    affiliation: text("affiliation").notNull().default(""),
  });

  const talkPeople = schema.table(
    "talk_people",
    {
      talkId: text("talk_id")
        .notNull()
        .references(() => talks.id, { onDelete: "cascade" }),
      personId: text("person_id")
        .notNull()
        .references(() => people.id, { onDelete: "cascade" }),
    },
    (t) => [primaryKey({ columns: [t.talkId, t.personId] }), index().on(t.personId)],
  );

  const stars = schema.table(
    "stars",
    {
      userId: text("user_id").notNull(),
      targetKind: text("target_kind").notNull(),
      targetId: text("target_id").notNull(),
      createdAt: instant("created_at").notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.userId, t.targetKind, t.targetId] })],
  );

  const notes = schema.table(
    "notes",
    {
      userId: text("user_id").notNull(),
      targetKind: text("target_kind").notNull(),
      targetId: text("target_id").notNull(),
      body: text("body").notNull(),
      updatedAt: instant("updated_at").notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.userId, t.targetKind, t.targetId] })],
  );

  /** Each send of the programme to the conference API. One row at a time may be running: the partial unique
   *  index refuses a second, which is what keeps two sends from running at once. */
  const syncRuns = schema.table(
    "sync_runs",
    {
      id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
      syncName: text("sync_name").notNull().unique(),
      state: text("state").notNull(),
      startedAt: instant("started_at").notNull().defaultNow(),
      finishedAt: instant("finished_at"),
      sent: integer("sent").notNull().default(0),
      added: integer("added").notNull().default(0),
      changed: integer("changed").notNull().default(0),
      withdrawn: integer("withdrawn").notNull().default(0),
      unchanged: integer("unchanged").notNull().default(0),
      programmeVersion: text("programme_version").notNull().default(""),
      error: text("error").notNull().default(""),
    },
    (t) => [
      uniqueIndex("sync_runs_one_running").on(t.state).where(sql`state = 'running'`),
      check("sync_runs_state", sql`${t.state} in ('running', 'sent', 'failed', 'interrupted')`),
    ],
  );

  return { schema, meeting, tracks, sessions, talks, people, talkPeople, stars, notes, syncRuns };
}

export const amsTables = societyTables("ams2027");
export const gsaTables = societyTables("gsa2026");
export type SocietyTables = typeof amsTables;

export const SOCIETY_TABLES = { ams: amsTables, gsa: gsaTables } as const;
export type Society = keyof typeof SOCIETY_TABLES;

// drizzle-kit finds schemas and tables only in top-level exports.
export const {
  schema: ams2027,
  meeting: amsMeeting,
  tracks: amsTracks,
  sessions: amsSessions,
  talks: amsTalks,
  people: amsPeople,
  talkPeople: amsTalkPeople,
  stars: amsStars,
  notes: amsNotes,
  syncRuns: amsSyncRuns,
} = amsTables;
export const {
  schema: gsa2026,
  meeting: gsaMeeting,
  tracks: gsaTracks,
  sessions: gsaSessions,
  talks: gsaTalks,
  people: gsaPeople,
  talkPeople: gsaTalkPeople,
  stars: gsaStars,
  notes: gsaNotes,
  syncRuns: gsaSyncRuns,
} = gsaTables;

// The auth schema is shared by both societies' hosted copies.
export * from "./auth-schema";
