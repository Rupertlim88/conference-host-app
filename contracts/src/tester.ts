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

/** Where our versions place the held talks, in the programme map's shapes: each time block with its sessions, each
 *  session with its start and talks, and each conference with its talks. */
export const LayoutSchema = z.strictObject({
  timeBlocks: z.array(z.strictObject({ start: MeetingMinuteSchema, sessions: Ids })),
  sessions: z.array(z.strictObject({ id: Id, start: MeetingMinuteSchema, talks: Ids })),
  conferences: z.array(z.strictObject({ trackId: Id, title: z.string(), talks: Ids })),
});
export type Layout = z.infer<typeof LayoutSchema>;

/** The ids listed more than once, in the order they first repeat. */
const repeated = (ids: string[]) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

/** Why a layout does not agree with itself or with the talks the test set holds, one reason for each problem. */
export function layoutProblems(layout: Layout, held: string[]): string[] {
  const problems: string[] = [];
  const say = (what: string, ids: string[]) => {
    if (ids.length) problems.push(`${what}: ${ids.join(", ")}`);
  };
  const holds = new Set(held);
  const placed = [...layout.sessions.flatMap((s) => s.talks), ...layout.conferences.flatMap((c) => c.talks)];
  say("places talks the test set does not hold", [...new Set(placed.filter((id) => !holds.has(id)))]);
  say("places a talk in two sessions", repeated(layout.sessions.flatMap((s) => s.talks)));
  say("lists a session twice", repeated(layout.sessions.map((s) => s.id)));
  say("lists a conference twice", repeated(layout.conferences.map((c) => c.trackId)));
  const startOf = new Map(layout.sessions.map((s) => [s.id, s.start]));
  const inBlocks = layout.timeBlocks.flatMap((b) => b.sessions);
  say("a time block names a session the layout does not list", inBlocks.filter((id) => !startOf.has(id)));
  say(
    "a time block names a session that starts at another time",
    layout.timeBlocks.flatMap((b) => b.sessions.filter((id) => startOf.has(id) && startOf.get(id) !== b.start)),
  );
  say("a session is in no time block", layout.sessions.map((s) => s.id).filter((id) => !inBlocks.includes(id)));
  say("a session is in two time blocks", repeated(inBlocks));
  return problems;
}

/** The talks for the demo to hold, and the abstracts to test among them; the first abstract is the demo's. A layout,
 *  when given, says where our versions place the talks. */
export const TestSetSchema = z
  .strictObject({
    conference: z.string().min(1).max(100),
    askers: Ids.min(1).max(MOST_TALKS).refine(distinct, "lists the same abstract twice"),
    talks: Ids.min(1).max(MOST_TALKS).refine(distinct, "lists the same talk twice"),
    layout: LayoutSchema.optional(),
  })
  .superRefine((testSet, ctx) => {
    if (!testSet.layout) return;
    for (const message of layoutProblems(testSet.layout, testSet.talks)) ctx.addIssue({ code: "custom", path: ["layout"], message });
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
