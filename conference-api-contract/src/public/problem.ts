import { z } from "zod";

import { operational, pii, programme } from "./labels";

import { PartnerIdSchema, RequestIdSchema } from "./ids";
import { text } from "./text";

/** One problem with one field of one talk, as a refused talks:write lists it. */
export const TalkErrorSchema = z.strictObject({
  talk: programme(PartnerIdSchema.optional()),
  field: operational(text(1, 200)),
  /** May name a person the request named, such as one who was erased. */
  problem: pii(text(1, 500)),
});
export type TalkError = z.infer<typeof TalkErrorSchema>;

/** A refusal, as RFC 9457 problem details. Callers see only this safe description. */
/** The error codes OAuth 2 defines for a token endpoint (RFC 6749 section 5.2), and for a service that is briefly
 *  unavailable (section 4.1.2.1). */
export const OAUTH_ERRORS = [
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
  "temporarily_unavailable",
] as const;

export const ProblemSchema = z.strictObject({
  type: operational(z.string().regex(/^\/problems\/[a-z0-9-]{1,60}$/)),
  title: operational(text(1, 200)),
  status: operational(z.int().min(400).max(599)),
  detail: operational(text(1, 2000).optional()),
  errors: pii(z.array(TalkErrorSchema).max(1000).optional()),
  /** Present only on the answers of the sign-in endpoint: the OAuth 2 error code, which OAuth libraries read.
   *  Absent elsewhere. */
  error: operational(z.enum(OAUTH_ERRORS).optional()),
  requestId: operational(RequestIdSchema),
});
export type Problem = z.infer<typeof ProblemSchema>;
