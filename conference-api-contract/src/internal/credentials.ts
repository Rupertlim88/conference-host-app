import { z } from "zod";

import { CredentialIdSchema, WithdrawnCredentialSchema } from "../public/credentials";
import { ConferenceIdSchema, PartnerIdSchema } from "../public/ids";
import { text } from "../public/text";
import { SealedFieldSchema, WrappedKeySchema } from "./attendance";

/** A signed credential, sealed under the person's own key, in base64: erasing the person makes it unreadable. */
export const SealedDocumentSchema = z.string().min(40).max(60_000).regex(/^(?:[A-Za-z0-9+/]{4})+(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);

/** A W3C Bitstring Status List holds 131,072 entries, the smallest size the standard allows, so a withdrawn
 *  credential hides among many. */
export const STATUS_LIST_SIZE = 131_072;

/** One credential, as the conference's database keeps it. */
export const CredentialRecordSchema = z.strictObject({
  credential: CredentialIdSchema,
  statusIndex: z.int().min(0).max(STATUS_LIST_SIZE - 1),
  issuedAt: z.iso.datetime(),
  status: z.enum(["active", "withdrawn"]),
  withdrawnAt: z.iso.datetime().optional(),
  /** Absent until the credential is signed. */
  sealedJwt: SealedDocumentSchema.optional(),
});
export type CredentialRecord = z.infer<typeof CredentialRecordSchema>;

/** A person's line in the latest attendance entry that names them, sealed; or that they were erased, or never
 *  reported. */
export const PersonAttendanceSchema = z.union([
  z.strictObject({ unknown: z.literal(true) }),
  z.strictObject({ erased: z.literal(true) }),
  z.strictObject({
    wrappedKey: WrappedKeySchema,
    line: z.strictObject({ name: SealedFieldSchema, orcid: SealedFieldSchema.optional(), attended: SealedFieldSchema }),
  }),
]);
export type PersonAttendance = z.infer<typeof PersonAttendanceSchema>;

export const WithdrawCredentialOutcomeSchema = z.union([
  z.strictObject({ ok: z.literal(true), result: WithdrawnCredentialSchema }),
  z.strictObject({ ok: z.literal(false), notFound: z.literal(true) }),
]);
export type WithdrawCredentialOutcome = z.infer<typeof WithdrawCredentialOutcomeSchema>;

/** Which status list entries are withdrawn, and how many credentials the conference has issued. */
export const CredentialStatusSchema = z.strictObject({
  issued: z.int().min(0).max(STATUS_LIST_SIZE),
  withdrawn: z.array(z.int().min(0).max(STATUS_LIST_SIZE - 1)).max(STATUS_LIST_SIZE),
});
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;

/** The days a conference ran, from its earliest talk start to its latest talk end; null when no talk has times. */
export const ConferenceDatesSchema = z.strictObject({ from: z.iso.date(), until: z.iso.date() }).nullable();
export type ConferenceDates = z.infer<typeof ConferenceDatesSchema>;

/** A conference as the control database knows it: its name and its organiser's. */
export const ConferenceProfileSchema = z.strictObject({
  id: ConferenceIdSchema,
  name: text(1, 300),
  organiser: z.strictObject({ id: PartnerIdSchema, name: text(1, 300) }),
});
export type ConferenceProfile = z.infer<typeof ConferenceProfileSchema>;
