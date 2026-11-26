// Every refusal has one safe shape.
import { z } from "zod";

import { PartnerIdSchema, RequestIdSchema } from "./ids";
import { text } from "./text";

/** One problem with one field of one talk, as a refused talks:write lists it. */
export const TalkErrorSchema = z.strictObject({
  talk: PartnerIdSchema.optional(),
  field: text(1, 200),
  /** Can name a person the request named, such as one who was erased. */
  problem: text(1, 500),
});
export type TalkError = z.infer<typeof TalkErrorSchema>;

/** A refusal, as RFC 9457 problem details: the only description of a failure a caller ever sees. */
export const ProblemSchema = z.strictObject({
  type: z.string().regex(/^\/problems\/[a-z0-9-]{1,60}$/),
  title: text(1, 200),
  status: z.int().min(400).max(599),
  detail: text(1, 2000).optional(),
  errors: z.array(TalkErrorSchema).max(1000).optional(),
  requestId: RequestIdSchema,
});
export type Problem = z.infer<typeof ProblemSchema>;
