// The tester's three requests have fixed forms.
import { z } from "zod";

import { Id } from "./programme";

/** A time on the meeting's clock, to the minute: 2027-01-11T08:30. */
export const MeetingMinuteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

const Ids = z.array(Id);
const distinct = (ids: string[]) => new Set(ids).size === ids.length;

/** AMS's whole published programme, talks only: each time block with its sessions, each session with its talks, and
 *  each conference with its talks. */
export const ProgrammeMapSchema = z.strictObject({
  conference: z.string(),
  timeBlocks: z.array(z.strictObject({ start: MeetingMinuteSchema, sessions: Ids })),
  sessions: z.array(z.strictObject({ id: Id, start: MeetingMinuteSchema.nullable(), talks: Ids })),
  conferences: z.array(z.strictObject({ trackId: Id, title: z.string(), talks: Ids })),
});
export type ProgrammeMap = z.infer<typeof ProgrammeMapSchema>;

/** More talks than AMS's whole programme holds, so a test set can name any of them. */
const MOST_TALKS = 10_000;

/** The talks for the demo to hold, and the abstracts to test among them; the first abstract is the demo's. */
export const TestSetSchema = z.strictObject({
  conference: z.string().min(1).max(100),
  askers: Ids.min(1).max(MOST_TALKS).refine(distinct, "lists the same abstract twice"),
  talks: Ids.min(1).max(MOST_TALKS).refine(distinct, "lists the same talk twice"),
});
export type TestSet = z.infer<typeof TestSetSchema>;

export const TestSetReplySchema = z.strictObject({ sentProgrammeVersion: z.string() });
export type TestSetReply = z.infer<typeof TestSetReplySchema>;

/** The places that recommend talks around an abstract: its related talks, each other conference, each of its own
 *  conferences (for the tester only), each day, each time block and each session. */
export const PlaceLayoutSchema = z.enum(["related", "conference_outside", "conference_inside", "day", "time_block", "session"]);
export type PlaceLayout = z.infer<typeof PlaceLayoutSchema>;

/** How many talks each place shows visitors at most. The backend keeps that many in each place's related talks or
 *  pool, which the pages show and the tester's report reads. */
export const SHOWN_PER_PLACE = {
  related: 5,
  conference_outside: 1,
  conference_inside: 0,
  day: 3,
  time_block: 2,
  session: 1,
} as const satisfies Record<PlaceLayout, number>;

/** One place: the held talks it chose from, the talks it shows, every verdict the matching API listed on those talks,
 *  passed on as the API gave it, and the talks it listed no verdict for. */
export const PlaceSchema = z.strictObject({
  layout: PlaceLayoutSchema,
  key: z.string(),
  pool: Ids,
  shown: Ids,
  verdicts: z.array(z.record(z.string(), z.unknown())),
  notJudged: Ids,
});
export type Place = z.infer<typeof PlaceSchema>;

export const RecommendationsInputSchema = z.strictObject({ abstract: Id });

export const RecommendationsSchema = z.strictObject({
  abstract: Id,
  sentProgrammeVersion: z.string().nullable(),
  matchesProgrammeVersion: z.string().nullable(),
  places: z.array(PlaceSchema),
});
export type Recommendations = z.infer<typeof RecommendationsSchema>;

/** The tester's forms by the name each is published under as JSON Schema. */
export const TESTER_FORMS = {
  "programme-map": ProgrammeMapSchema,
  "test-set": TestSetSchema,
  "test-set-reply": TestSetReplySchema,
  recommendations: RecommendationsSchema,
} as const;
