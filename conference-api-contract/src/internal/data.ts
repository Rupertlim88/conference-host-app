import { z } from "zod";

import { PartnerIdSchema, RequestIdSchema } from "../public/ids";
import { MatchesFromTextRequestSchema, MatchesSearchRequestSchema, MatchesSearchResponseSchema } from "../public/matches";
import { TalkErrorSchema } from "../public/problem";
import { TalksWriteRequestSchema, TalksWriteResponseSchema } from "../public/talks";
import { EngineIdSchema } from "./engine";

/** Who made a change: the partner that sent it, and the organiser it acted for (the partner itself, for an
 *  organiser). Stored with the change, in the same transaction. */
export const ActorSchema = z.strictObject({ partner: PartnerIdSchema, organiser: PartnerIdSchema });
export type Actor = z.infer<typeof ActorSchema>;

/** What the backend asks the data layer to apply, once the request has passed the public contract. */
export const WriteTalksCommandSchema = z.strictObject({
  requestId: RequestIdSchema,
  actor: ActorSchema,
  request: TalksWriteRequestSchema,
});
export type WriteTalksCommand = z.infer<typeof WriteTalksCommandSchema>;

/** Applied in full, or refused with every problem found and nothing applied. */
export const WriteTalksOutcomeSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), result: TalksWriteResponseSchema }),
  z.strictObject({ ok: z.literal(false), errors: z.array(TalkErrorSchema).min(1).max(1000) }),
]);
export type WriteTalksOutcome = z.infer<typeof WriteTalksOutcomeSchema>;

/** A search, with the engine whose matches it serves (set by configuration) and the partner it is for. Page tokens
 *  are bound to all three. */
export const SearchMatchesQuerySchema = z.strictObject({
  engine: EngineIdSchema,
  actor: ActorSchema,
  request: MatchesSearchRequestSchema,
});
export type SearchMatchesQuery = z.infer<typeof SearchMatchesQuerySchema>;

export const SearchMatchesOutcomeSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), result: MatchesSearchResponseSchema }),
  z.strictObject({ ok: z.literal(false), problem: z.literal("page-token-invalid") }),
]);
export type SearchMatchesOutcome = z.infer<typeof SearchMatchesOutcomeSchema>;

/** A text to match on the spot, by the engine that serves the conference's matches. */
export const TextRequestCommandSchema = z.strictObject({
  engine: EngineIdSchema,
  actor: ActorSchema,
  request: MatchesFromTextRequestSchema,
});
export type TextRequestCommand = z.infer<typeof TextRequestCommandSchema>;

