import { z } from "zod";

import { AgreementSchema } from "../public/agreements";
import { PartnerIdSchema } from "../public/ids";
import { TalkErrorSchema } from "../public/problem";
import { PartnerKindSchema, ProviderScopeSchema, ScopeSchema } from "../public/scopes";

/** What a token stands for, as the control database returns it. A token a partner got by signing in through the
 *  sign-in service also brings back the signed token it stands for, still sealed with a key only the opaque token
 *  gives: AES-256-GCM's nonce, ciphertext and tag, in hex. A token our team issued by hand has none. */
export const CallerRecordSchema = z.strictObject({
  partner: PartnerIdSchema,
  kind: PartnerKindSchema,
  scopes: z.array(ScopeSchema).min(1),
  sealedSignedToken: z
    .string()
    .regex(/^(?:[0-9a-f]{2}){29,16384}$/)
    .optional(),
});
export type CallerRecord = z.infer<typeof CallerRecordSchema>;

/** What the access rulebook needs about a partner and a conference, read fresh for every request. */
export const AccessFactsSchema = z.strictObject({
  partnerKind: PartnerKindSchema,
  organiser: PartnerIdSchema,
  granted: z.array(ScopeSchema),
  agreed: z.array(ProviderScopeSchema),
});
export type AccessFactsRecord = z.infer<typeof AccessFactsSchema>;

/** Creating, changing or withdrawing an agreement: done, refused with every problem found, or not found. */
export const AgreementOutcomeSchema = z.union([
  z.strictObject({ ok: z.literal(true), agreement: AgreementSchema }),
  z.strictObject({ ok: z.literal(false), errors: z.array(TalkErrorSchema).min(1).max(1000) }),
  z.strictObject({ ok: z.literal(false), notFound: z.literal(true) }),
]);
export type AgreementOutcome = z.infer<typeof AgreementOutcomeSchema>;

export const AgreementListSchema = z.array(AgreementSchema).max(1000);
