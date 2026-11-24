import { z } from "zod";

export const SocietySchema = z.enum(["ams", "gsa"]);
export type Society = z.infer<typeof SocietySchema>;

const Id = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/);
/** Postgres text cannot hold the NUL character, so text bound for the database refuses it. */
const noNul = (text: string) => !text.includes("\u0000");
const NUL_MESSAGE = "contains a NUL character";
const Instant = z.iso.datetime().nullable();

export const IdInputSchema = z.strictObject({ id: Id });
export const DateInputSchema = z.strictObject({ date: z.iso.date() });
export const SearchInputSchema = z.strictObject({ q: z.string().trim().min(2).max(100).refine(noNul, NUL_MESSAGE) });

export const TargetKindSchema = z.enum(["talk", "session"]);
export type TargetKind = z.infer<typeof TargetKindSchema>;
export const TargetSchema = z.strictObject({ targetKind: TargetKindSchema, targetId: Id });
export type Target = z.infer<typeof TargetSchema>;
export const NoteInputSchema = TargetSchema.extend({ body: z.string().max(5000).refine(noNul, NUL_MESSAGE) });

export const MeetingSchema = z.strictObject({
  name: z.string(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  timeZone: z.string(),
  venue: z.string(),
  city: z.string(),
  about: z.string(),
});
export type Meeting = z.infer<typeof MeetingSchema>;

export const DaySchema = z.strictObject({ date: z.iso.date(), sessions: z.int().min(0) });
export type Day = z.infer<typeof DaySchema>;

export const TrackSchema = z.strictObject({ id: Id, code: z.string(), title: z.string() });
export type Track = z.infer<typeof TrackSchema>;

export const SessionSummarySchema = z.strictObject({
  id: Id,
  number: z.string(),
  title: z.string(),
  kind: z.string(),
  format: z.string(),
  startsAt: Instant,
  endsAt: Instant,
  room: z.string(),
  building: z.string(),
  trackIds: z.array(Id),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export const TalkKindSchema = z.enum(["oral", "poster", "break"]);

export const TalkSummarySchema = z.strictObject({
  id: Id,
  sessionId: Id.nullable(),
  number: z.string(),
  title: z.string(),
  kind: TalkKindSchema,
  startsAt: Instant,
  endsAt: Instant,
  room: z.string(),
  building: z.string(),
  booth: z.string(),
  presentingAuthor: z.string(),
  authorLine: z.string(),
});
export type TalkSummary = z.infer<typeof TalkSummarySchema>;

export const TalkDetailSchema = TalkSummarySchema.extend({
  abstract: z.string(),
  affiliations: z.array(z.string()),
  doi: z.string(),
  citation: z.string(),
  trackIds: z.array(Id),
  session: SessionSummarySchema.nullable(),
});
export type TalkDetail = z.infer<typeof TalkDetailSchema>;

export const SessionDetailSchema = SessionSummarySchema.extend({
  description: z.string(),
  chairs: z.string(),
  tracks: z.array(TrackSchema),
  talks: z.array(TalkSummarySchema),
});
export type SessionDetail = z.infer<typeof SessionDetailSchema>;

export const TrackDetailSchema = TrackSchema.extend({ sessions: z.array(SessionSummarySchema) });
export type TrackDetail = z.infer<typeof TrackDetailSchema>;

export const PersonSchema = z.strictObject({ id: Id, name: z.string(), affiliation: z.string() });
export type Person = z.infer<typeof PersonSchema>;
export const PersonDetailSchema = PersonSchema.extend({ talks: z.array(TalkSummarySchema) });
export type PersonDetail = z.infer<typeof PersonDetailSchema>;

export const SearchResultsSchema = z.strictObject({
  talks: z.array(TalkSummarySchema),
  sessions: z.array(SessionSummarySchema),
  people: z.array(PersonSchema),
});
export type SearchResults = z.infer<typeof SearchResultsSchema>;

export const ScheduleSchema = z.strictObject({
  talks: z.array(TalkSummarySchema),
  sessions: z.array(SessionSummarySchema),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const NoteSchema = TargetSchema.extend({
  body: z.string(),
  updatedAt: z.iso.datetime(),
  /** The title of the talk or session the note is on. */
  title: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;

export const RelatedMatchSchema = z.strictObject({
  talk: TalkSummarySchema,
  kind: z.enum(["core", "unexpected"]),
  score: z.number().min(0).max(1),
  reason: z.string(),
});
export type RelatedMatch = z.infer<typeof RelatedMatchSchema>;

export const RelatedTalksSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("matches"), matches: z.array(RelatedMatchSchema).min(1) }),
  z.strictObject({ status: z.literal("none") }),
  z.strictObject({ status: z.literal("unavailable") }),
]);
export type RelatedTalks = z.infer<typeof RelatedTalksSchema>;

export const ViewerSchema = z.strictObject({ name: z.string(), email: z.string(), image: z.string().nullable() });
export type Viewer = z.infer<typeof ViewerSchema>;

export const SessionKindSchema = z.strictObject({ kind: z.string(), sessions: z.int().min(1) });
export type SessionKind = z.infer<typeof SessionKindSchema>;
export const KindInputSchema = z.strictObject({ kind: z.string().trim().min(1).max(100) });

// ---- Organiser console ----

/** Talks and sessions per page in the organiser console's lists. */
export const PAGE_SIZE = 50;

const ListText = z.string().trim().max(100).refine(noNul, NUL_MESSAGE).default("");
const PageNumber = z.int().min(1).max(10_000).default(1);
/** A time of day on the 24-hour clock, as HH:MM. */
const Clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const TalkStatusFilterSchema = z.enum(["all", "scheduled", "withdrawn", "changed"]);
export type TalkStatusFilter = z.infer<typeof TalkStatusFilterSchema>;

export const TalkListInputSchema = z.strictObject({
  q: ListText,
  status: TalkStatusFilterSchema.default("all"),
  sessionId: Id.optional(),
  page: PageNumber,
});
export type TalkListInput = z.input<typeof TalkListInputSchema>;

/** How a talk differs from the published programme: in another session, or at another time, place or order. */
export const TalkChangeSchema = z.enum(["none", "moved", "rescheduled"]);
export type TalkChange = z.infer<typeof TalkChangeSchema>;

export const OrganiserTalkSchema = TalkSummarySchema.extend({
  withdrawn: z.boolean(),
  change: TalkChangeSchema,
  sessionNumber: z.string(),
  sessionTitle: z.string(),
});
export type OrganiserTalk = z.infer<typeof OrganiserTalkSchema>;

const Total = z.int().min(0);

export const TalkListSchema = z.strictObject({
  talks: z.array(OrganiserTalkSchema).max(PAGE_SIZE),
  total: Total,
  page: z.int().min(1),
});
export type TalkList = z.infer<typeof TalkListSchema>;

export const SessionListInputSchema = z.strictObject({ q: ListText, page: PageNumber });
export type SessionListInput = z.input<typeof SessionListInputSchema>;

export const OrganiserSessionSchema = SessionSummarySchema.extend({
  talks: Total,
  /** The session's time or room differs from the published programme. */
  changed: z.boolean(),
});
export type OrganiserSession = z.infer<typeof OrganiserSessionSchema>;

export const SessionListSchema = z.strictObject({
  sessions: z.array(OrganiserSessionSchema).max(PAGE_SIZE),
  total: Total,
  page: z.int().min(1),
});
export type SessionList = z.infer<typeof SessionListSchema>;

export const OrganiserSessionDetailSchema = SessionDetailSchema.extend({
  changed: z.boolean(),
  talks: z.array(OrganiserTalkSchema),
});
export type OrganiserSessionDetail = z.infer<typeof OrganiserSessionDetailSchema>;

export const MoveTalkInputSchema = z.strictObject({ id: Id, sessionId: Id });
export type MoveTalkInput = z.infer<typeof MoveTalkInputSchema>;

/** A session's new date, times and room, in the meeting's time zone. Empty times leave the session with no time,
 *  or with no end. */
export const SessionChangeInputSchema = z.strictObject({
  id: Id,
  date: z.iso.date().or(z.literal("")),
  start: Clock.or(z.literal("")),
  end: Clock.or(z.literal("")),
  room: z.string().trim().max(200).refine(noNul, NUL_MESSAGE),
});
export type SessionChangeInput = z.infer<typeof SessionChangeInputSchema>;

/** Counts of differences from the published programme. A withdrawn talk counts only as withdrawn. */
export const ChangesSchema = z.strictObject({ moved: Total, rescheduled: Total, withdrawn: Total, sessions: Total });
export type Changes = z.infer<typeof ChangesSchema>;

/** What a reset put back: talks and sessions that differed from the published programme. */
export const ResetResultSchema = z.strictObject({ talks: Total, sessions: Total });
export type ResetResult = z.infer<typeof ResetResultSchema>;

// ---- Sending the programme ----

export const SyncRunStateSchema = z.enum(["running", "sent", "failed", "interrupted"]);
export type SyncRunState = z.infer<typeof SyncRunStateSchema>;

export const SyncRunSchema = z.strictObject({
  id: z.int().min(1),
  state: SyncRunStateSchema,
  startedAt: z.iso.datetime(),
  finishedAt: Instant,
  sent: Total,
  added: Total,
  changed: Total,
  withdrawn: Total,
  unchanged: Total,
  programmeVersion: z.string(),
  /** Why a failed run failed: the API's status and problem title, never its body or the key. Empty otherwise. */
  error: z.string(),
});
export type SyncRun = z.infer<typeof SyncRunSchema>;

// ---- Developer console ----

export const ConnectionStatusSchema = z.enum([
  "ok",
  "not-set",
  "refused-key",
  "no-programme",
  "unreachable",
  "unexpected-answer",
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const ConnectionTestSchema = z.strictObject({
  status: ConnectionStatusSchema,
  httpStatus: z.int().min(100).max(599).nullable(),
  ms: z.int().min(0).nullable(),
});
export type ConnectionTest = z.infer<typeof ConnectionTestSchema>;

export const ApiStatusSchema = z.strictObject({
  /** The API's address without credentials, query or fragment. */
  apiAddress: z.string().nullable(),
  keySet: z.boolean(),
  lastRun: SyncRunSchema.nullable(),
  changes: ChangesSchema,
});
export type ApiStatus = z.infer<typeof ApiStatusSchema>;
