// The attendee app and the backend pass the programme in fixed forms.
import { z } from "zod";

export const SocietySchema = z.enum(["ams"]);
export type Society = z.infer<typeof SocietySchema>;

export const Id = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/);
/** Postgres text cannot hold the NUL character, so text bound for the database refuses it. */
export const noNul = (text: string) => !text.includes("\u0000");
export const NUL_MESSAGE = "contains a NUL character";
export const Instant = z.iso.datetime().nullable();

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
/** One guest's note on a talk or session, or null when there is none. */
export const SavedNoteSchema = z.strictObject({ body: z.string(), updatedAt: z.iso.datetime() }).nullable();
export type SavedNote = z.infer<typeof SavedNoteSchema>;

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

/** The programmes AMS's menu opens by name, as AMS's programme codes. */
export const MenuProgrammeSchema = z.enum(["EVENT", "EXHIBITHALL", "CAREERFAIR", "SPONSORS", "PRESIDENTIAL", "TOWNHALL"]);
export type MenuProgramme = z.infer<typeof MenuProgrammeSchema>;
export const CodeInputSchema = z.strictObject({ code: MenuProgrammeSchema });

/** Program Highlights' lists that the programme's own data marks. */
export const HighlightListSchema = z.enum(["themed", "supplementary", "keynotes", "fellows", "posters"]);
export type HighlightList = z.infer<typeof HighlightListSchema>;
export const HighlightInputSchema = z.strictObject({ list: HighlightListSchema });
export const HighlightSchema = z.strictObject({ sessions: z.array(SessionSummarySchema), talks: z.array(TalkSummarySchema) });
export type Highlight = z.infer<typeof HighlightSchema>;

/** The meeting's pages of names: each heading with its lines of names, in order. */
export const NamePageSchema = z.enum(["officers", "committees"]);
export type NamePage = z.infer<typeof NamePageSchema>;
export const NamePageInputSchema = z.strictObject({ page: NamePageSchema });
export const NameSectionSchema = z.strictObject({ heading: z.string(), lines: z.array(z.string()) });
export type NameSection = z.infer<typeof NameSectionSchema>;

/** The demo's fixed abstract, and how many of the matching API's matches for it fall in each track; the counts are
 *  null when the API cannot answer. */
export const AroundAbstractSchema = z.strictObject({
  abstract: TalkSummarySchema.nullable(),
  matchesByTrack: z.record(Id, z.int().min(1)).nullable(),
});
export type AroundAbstract = z.infer<typeof AroundAbstractSchema>;
