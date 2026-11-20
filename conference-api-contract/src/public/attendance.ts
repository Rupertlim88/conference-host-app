import { z } from "zod";

import { operational, pii } from "./labels";

import { PartnerIdSchema } from "./ids";
import { OrcidSchema } from "./talks";
import { text } from "./text";

/** Our ID for an entry in a conference's attendance log: 128 random bits. */
export const AttendanceEntryIdSchema = z.string().regex(/^att_[A-Za-z0-9_-]{22}$/);
export type AttendanceEntryId = z.infer<typeof AttendanceEntryIdSchema>;

const AttendeeSchema = z.strictObject({
  /** The partner's own ID for the person. */
  person: pii(PartnerIdSchema),
  /** The person's full name. */
  name: pii(text(1, 300)),
  /** The person's ORCID iD, if known: it identifies exactly who they are. */
  orcid: pii(OrcidSchema.optional()),
  /** Whether they attended the conference. */
  attended: pii(z.boolean()),
});

/** Who attended a conference, as the partner reports it. The request must be signed over the whole message
 *  (see the specification's x-signed). Each report becomes one entry in the conference's tamper-evident log;
 *  resending a report with the same reportId answers the entry it already made. */
export const AttendanceReportRequestSchema = z.strictObject({
  /** The partner's own ID for this report, so a resend is recognised. */
  reportId: operational(PartnerIdSchema),
  attendees: pii(
    z
      .array(AttendeeSchema)
      .min(1)
      .max(5000)
      .refine((list) => new Set(list.map((a) => a.person)).size === list.length, "lists the same person twice"),
  ),
  /** An earlier entry this report corrects. A correction never overwrites: it is a new entry pointing back. */
  corrects: operational(AttendanceEntryIdSchema.optional()),
});
export type AttendanceReportRequest = z.infer<typeof AttendanceReportRequestSchema>;

export const AttendanceReportResponseSchema = z.strictObject({
  entry: operational(AttendanceEntryIdSchema),
  /** The entry's place in the conference's log, from 1. */
  sequence: operational(z.int().min(1).max(Number.MAX_SAFE_INTEGER)),
  recordedAt: operational(z.iso.datetime()),
  attendees: operational(z.int().min(1).max(5000)),
  corrects: operational(AttendanceEntryIdSchema.optional()),
});
export type AttendanceReportResponse = z.infer<typeof AttendanceReportResponseSchema>;

/** Erasing takes no terms. */
export const ErasePersonRequestSchema = z.strictObject({});

/** The person's key is deleted: their name, ORCID iD and attendance can never be read again, anywhere. */
export const ErasedPersonSchema = z.strictObject({ person: pii(PartnerIdSchema), erasedAt: operational(z.iso.datetime()) });
export type ErasedPerson = z.infer<typeof ErasedPersonSchema>;

