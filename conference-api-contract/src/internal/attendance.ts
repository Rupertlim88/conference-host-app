import { z } from "zod";

import { AttendanceEntryIdSchema, AttendanceReportResponseSchema, ErasedPersonSchema } from "../public/attendance";
import { PartnerIdSchema } from "../public/ids";
import { TalkErrorSchema } from "../public/problem";
import { ActorSchema } from "./data";

/** Standard base64 with padding. Each group is exactly four characters, so matching never backtracks. */
const BASE64 = /^(?:[A-Za-z0-9+/]{4})+(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/** One field sealed under a person's own key: format byte, 12-byte nonce, ciphertext and 16-byte tag, so at least
 *  30 bytes, in base64. Plain text can never pass for one by accident. */
export const SealedFieldSchema = z.string().min(40).max(2000).regex(BASE64);

/** A person's key, wrapped by their organiser's key, in base64. */
export const WrappedKeySchema = z.string().min(40).max(2000).regex(BASE64);

/** A partner's own ID for one of its signing keys. */
export const PartnerKeyIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/);

/** The checked signature of a report, kept with its entry so anyone holding the partner's key can check it again. */
export const ReportSignatureSchema = z.strictObject({
  keyId: PartnerKeyIdSchema,
  signatureInput: z.string().min(1).max(2000),
  signature: z.string().min(1).max(2000),
  contentDigest: z.string().regex(/^sha-256=:[A-Za-z0-9+/]{43}=:$/),
});
export type ReportSignature = z.infer<typeof ReportSignatureSchema>;

/** A partner's registered signing key, as the control database returns it. */
export const PartnerKeyRecordSchema = z.strictObject({
  keyId: PartnerKeyIdSchema,
  alg: z.enum(["ecdsa-p256-sha256", "ed25519"]),
  publicKey: z.string().min(80).max(1000).startsWith("-----BEGIN PUBLIC KEY-----\n"),
});
export type PartnerKeyRecord = z.infer<typeof PartnerKeyRecordSchema>;

/** One attendance report, as the backend asks the conference's database to record it: every person's fields
 *  already sealed, and a wrapped key for each person the database has not seen before. */
export const RecordAttendanceCommandSchema = z.strictObject({
  reportId: PartnerIdSchema,
  actor: ActorSchema,
  signature: ReportSignatureSchema,
  corrects: AttendanceEntryIdSchema.optional(),
  newKeys: z.record(PartnerIdSchema, WrappedKeySchema),
  lines: z
    .array(
      z.strictObject({
        person: PartnerIdSchema,
        name: SealedFieldSchema,
        orcid: SealedFieldSchema.optional(),
        attended: SealedFieldSchema,
      }),
    )
    .min(1)
    .max(5000),
});
export type RecordAttendanceCommand = z.infer<typeof RecordAttendanceCommandSchema>;

/** Recorded; refused with every problem found and nothing recorded; or refused because people's keys changed
 *  since the backend read them, so it reads them again and seals afresh. */
export const RecordAttendanceOutcomeSchema = z.union([
  z.strictObject({
    ok: z.literal(true),
    result: AttendanceReportResponseSchema,
    /** The entry's SHA-256 chain hash, which its trusted timestamp covers. */
    hash: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    /** Whether the entry has its timestamp yet. */
    stamped: z.boolean(),
  }),
  z.strictObject({ ok: z.literal(false), errors: z.array(TalkErrorSchema).min(1).max(5000) }),
  z.strictObject({ ok: z.literal(false), keysChanged: z.literal(true) }),
]);
export type RecordAttendanceOutcome = z.infer<typeof RecordAttendanceOutcomeSchema>;

/** Each named person's stored key, or that they were erased. People never seen are left out. */
export const AttendeeKeysSchema = z.record(
  PartnerIdSchema,
  z.union([z.strictObject({ wrappedKey: WrappedKeySchema }), z.strictObject({ erased: z.literal(true) })]),
);
export type AttendeeKeys = z.infer<typeof AttendeeKeysSchema>;

export const ErasePersonOutcomeSchema = z.union([
  z.strictObject({ ok: z.literal(true), result: ErasedPersonSchema }),
  z.strictObject({ ok: z.literal(false), notFound: z.literal(true) }),
]);
export type ErasePersonOutcome = z.infer<typeof ErasePersonOutcomeSchema>;
