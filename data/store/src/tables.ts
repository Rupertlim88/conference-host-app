// The meeting has its own schema in the database, and sign-in has a schema of its own.
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
    /** False for a listing of organisations, such as the exhibit hall, which the conferences list leaves out. */
    listed: boolean("listed").notNull().default(true),
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
      /** On Program Highlights' list of the meeting's PEOPLE-themed sessions. */
      peopleThemed: boolean("people_themed").notNull().default(false),
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
      // Program Highlights' lists of talks: core science keynotes, new fellows and supplementary materials.
      coreKeynote: boolean("core_keynote").notNull().default(false),
      newFellow: boolean("new_fellow").notNull().default(false),
      supplementary: boolean("supplementary").notNull().default(false),
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

  /** The meeting's pages of names, officers and committees: each heading with its lines, in order. */
  const infoLists = schema.table(
    "info_lists",
    {
      page: text("page").notNull(),
      position: integer("position").notNull(),
      heading: text("heading").notNull(),
      lines: textArray("lines"),
    },
    (t) => [primaryKey({ columns: [t.page, t.position] })],
  );

  /** The demo's own settings, in one row: the abstract the demo is fixed to. */
  const demoSettings = schema.table("demo_settings", {
    id: smallint("id").primaryKey().default(1),
    fixedTalkId: text("fixed_talk_id"),
  });

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

  return { schema, meeting, tracks, sessions, talks, people, talkPeople, infoLists, demoSettings, stars, notes, syncRuns };
}

export const amsTables = societyTables("ams2027");
export type SocietyTables = typeof amsTables;

export const SOCIETY_TABLES = { ams: amsTables } as const;
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
  infoLists: amsInfoLists,
  demoSettings: amsDemoSettings,
  stars: amsStars,
  notes: amsNotes,
  syncRuns: amsSyncRuns,
} = amsTables;

export const authSchema = pgSchema("sign_in");

export const user = authSchema.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = authSchema.table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const account = authSchema.table(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("account_userId_idx").on(t.userId), uniqueIndex("account_issuer_accountId_uidx").on(t.issuer, t.accountId)],
);

export const verification = authSchema.table(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const authTables = { user, session, account, verification };
