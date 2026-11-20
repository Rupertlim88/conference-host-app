import { z } from "zod";

import { operational, pii, programme } from "./labels";

import { PartnerIdSchema } from "./ids";
import { OrcidSchema } from "./talks";
import { text } from "./text";

/** Our ID for an issued credential: 128 random bits. */
export const CredentialIdSchema = z.string().regex(/^cred_[A-Za-z0-9_-]{22}$/);
export type CredentialId = z.infer<typeof CredentialIdSchema>;

/** A credential secured as a compact JSON Web Signature (RFC 7515): three base64url parts. */
export const VcJwtSchema = z
  .string()
  .max(30_000)
  .regex(/^[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}$/);

/** The person must have attended, by the conference's latest attendance report naming them. */
export const IssueCredentialRequestSchema = z.strictObject({ person: pii(PartnerIdSchema) });
export type IssueCredentialRequest = z.infer<typeof IssueCredentialRequestSchema>;

/** An Open Badges 3.0 attendance credential, signed by us with ES256, for the partner to hand to the person. */
export const IssuedCredentialSchema = z.strictObject({
  credential: operational(CredentialIdSchema),
  person: pii(PartnerIdSchema),
  status: operational(z.literal("active")),
  issuedAt: operational(z.iso.datetime()),
  /** The signed credential. It states the person's name and ORCID iD, the conference, its dates and that we
   *  issued it. */
  jwt: pii(VcJwtSchema),
});
export type IssuedCredential = z.infer<typeof IssuedCredentialSchema>;

/** Withdrawing takes no terms. */
export const WithdrawCredentialRequestSchema = z.strictObject({});

export const WithdrawnCredentialSchema = z.strictObject({
  credential: operational(CredentialIdSchema),
  person: pii(PartnerIdSchema),
  status: operational(z.literal("withdrawn")),
  issuedAt: operational(z.iso.datetime()),
  withdrawnAt: operational(z.iso.datetime()),
});
export type WithdrawnCredential = z.infer<typeof WithdrawnCredentialSchema>;

/** Only a credential someone chose to share can be checked: nothing can be looked up by name. */
export const VerifyCredentialRequestSchema = z.strictObject({ credential: pii(VcJwtSchema) });
export type VerifyCredentialRequest = z.infer<typeof VerifyCredentialRequestSchema>;

/** What a credential with our valid signature says. */
const SaysSchema = z.strictObject({
  name: pii(text(1, 300)),
  orcid: pii(OrcidSchema.optional()),
  conference: programme(text(1, 300)),
  attendedFrom: programme(z.iso.date()),
  attendedUntil: programme(z.iso.date()),
  issuer: operational(text(1, 300)),
  issuedAt: operational(z.iso.datetime()),
});

/** A credential holds when its signature is ours, it has not been withdrawn, and it is within its dates. What it
 *  says is shown only once its signature is ours, and is never more than the credential itself holds. */
export const VerifyCredentialResponseSchema = z.union([
  z
    .strictObject({
      valid: operational(z.boolean()),
      checks: operational(
        z.strictObject({
          signature: operational(z.literal("valid")),
          status: operational(z.enum(["active", "withdrawn"])),
          dates: operational(z.enum(["current", "not-yet-valid", "expired"])),
        }),
      ),
      says: pii(SaysSchema),
    })
    .refine((a) => a.valid === (a.checks.status === "active" && a.checks.dates === "current"), "valid only when active and current"),
  z.strictObject({
    valid: operational(z.literal(false)),
    checks: operational(z.strictObject({ signature: operational(z.literal("invalid")) })),
  }),
]);
export type VerifyCredentialResponse = z.infer<typeof VerifyCredentialResponseSchema>;

const Base64Url256 = operational(z.string().regex(/^[A-Za-z0-9_-]{43}$/));

/** One of our public keys for checking credentials (RFC 7517), named by its RFC 7638 thumbprint. */
export const IssuerKeySchema = z.strictObject({
  kty: operational(z.literal("EC")),
  crv: operational(z.literal("P-256")),
  x: Base64Url256,
  y: Base64Url256,
  kid: Base64Url256,
  alg: operational(z.literal("ES256")),
  use: operational(z.literal("sig")),
});
export type IssuerKey = z.infer<typeof IssuerKeySchema>;

export const IssuerKeysSchema = z.strictObject({ keys: operational(z.array(IssuerKeySchema).min(1).max(10)) });
export type IssuerKeys = z.infer<typeof IssuerKeysSchema>;

/** A conference's W3C Bitstring Status List, as a credential signed by us. */
export const StatusListCredentialSchema = operational(VcJwtSchema);

/** The public page that checks a credential someone pastes. */
export const VerifyPageSchema = operational(z.string().min(1).max(100_000));
