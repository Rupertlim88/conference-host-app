import { z } from "zod";

import { Id, noNul, NUL_MESSAGE, TalkSummarySchema, SessionSummarySchema, SessionDetailSchema } from "./programme";

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

export const Total = z.int().min(0);

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
