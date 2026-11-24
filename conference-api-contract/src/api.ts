import { z } from "zod";

import { RecommendationSchema } from "./recommendation";
import { TalkSchema } from "./talk";

/** Engine IDs follow the row rule, and the API also caps how long an ID a client may send. */
export const EngineIdSchema = RecommendationSchema.shape.engine_id.max(64);

/** Whom the picks are for: a presenter (every talk they present is an anchor) or one talk. Both branches are strict,
 *  so a request naming both is refused rather than quietly settled one way. */
export const SubjectSchema = z
  .union([
    z.strictObject({ presenter_id: z.int().min(1), engine_id: EngineIdSchema.optional() }),
    z.strictObject({ talk_id: z.int().min(0), engine_id: EngineIdSchema.optional() }),
  ])
  .meta({ title: "Subject" });
export type Subject = z.infer<typeof SubjectSchema>;

/** A matched recommendation, joined with its candidate talk. */
export const PickSchema = RecommendationSchema.extend({ candidate: TalkSchema }).meta({ title: "Pick" });
export type Pick = z.infer<typeof PickSchema>;

export const PicksResponseSchema = z
  .strictObject({
    presenter_id: z.int().min(1).nullable(),
    anchors: z.array(TalkSchema),
    /** The anchors' match=true rows, ordered by for_talk_id, rank, candidate_id. */
    recommendations: z.array(PickSchema),
  })
  .meta({ title: "PicksResponse" });
export type PicksResponse = z.infer<typeof PicksResponseSchema>;

export const AgendaKindSchema = z.enum(["mine", "core", "surprise"]);
export type AgendaKind = z.infer<typeof AgendaKindSchema>;

/** The walk from the previous item on the same day. */
export const ConnectionSchema = z.strictObject({
  walk: z.int().min(0),
  /** Minutes to spare after walking; negative when the two talks clash. */
  slack: z.number(),
  /** Whether the slack is under the 15-minute threshold that counts as tight. */
  tight: z.boolean(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

/** The slim item the calendar shows, not the whole talk. Only timed talks appear, so start is never null. */
export const AgendaItemSchema = z
  .strictObject({
    id: z.int().min(0),
    title: z.string().min(1),
    session_title: z.string().nullable(),
    start: z.iso.datetime(),
    end: z.iso.datetime().nullable(),
    building: z.string().nullable(),
    room: z.string().nullable(),
    units: z.array(z.string()),
    kind: AgendaKindSchema,
    transit: ConnectionSchema.nullable(),
  })
  .meta({ title: "AgendaItem" });
export type AgendaItem = z.infer<typeof AgendaItemSchema>;

export const AgendaDaySchema = z
  .strictObject({
    /** The conference-local (America/Denver) calendar date, YYYY-MM-DD. */
    date: z.iso.date(),
    items: z.array(AgendaItemSchema),
  })
  .meta({ title: "AgendaDay" });

export const AgendaResponseSchema = z
  .strictObject({
    presenter_id: z.int().min(1).nullable(),
    days: z.array(AgendaDaySchema),
  })
  .meta({ title: "AgendaResponse" });
export type AgendaResponse = z.infer<typeof AgendaResponseSchema>;
