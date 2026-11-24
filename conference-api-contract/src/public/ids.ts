import { z } from "zod";

/** A partner's own ID for a talk, person or session. It is never used as it stands in a storage path. */
export const PartnerIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
export type PartnerId = z.infer<typeof PartnerIdSchema>;

/** Our ID for a conference, as it appears in the request path. */
export const ConferenceIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/);
export type ConferenceId = z.infer<typeof ConferenceIdSchema>;

/** An ID we make: a prefix, then 22 base64url characters holding 128 random bits. */
const randomId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9_-]{22}$`));

export const ProgrammeVersionSchema = randomId("pv");
export type ProgrammeVersion = z.infer<typeof ProgrammeVersionSchema>;

export const JobIdSchema = randomId("job");
export type JobId = z.infer<typeof JobIdSchema>;

export const RequestIdSchema = randomId("req");
export type RequestId = z.infer<typeof RequestIdSchema>;
