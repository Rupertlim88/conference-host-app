import { z } from "zod";

/** A partner's own ID for a talk, person or session: never used raw in a storage path. */
export const PartnerIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
export type PartnerId = z.infer<typeof PartnerIdSchema>;

/** Our ID for a conference, as it appears in the request path. */
export const ConferenceIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/);
export type ConferenceId = z.infer<typeof ConferenceIdSchema>;

/** 22 base64url characters carry the 128 random bits every unguessable ID needs. */
const RANDOM_PART = "[A-Za-z0-9_-]{22}";

export const ProgrammeVersionSchema = z.string().regex(new RegExp(`^pv_${RANDOM_PART}$`));
export type ProgrammeVersion = z.infer<typeof ProgrammeVersionSchema>;

export const JobIdSchema = z.string().regex(new RegExp(`^job_${RANDOM_PART}$`));
export type JobId = z.infer<typeof JobIdSchema>;

export const RequestIdSchema = z.string().regex(new RegExp(`^req_${RANDOM_PART}$`));
export type RequestId = z.infer<typeof RequestIdSchema>;
