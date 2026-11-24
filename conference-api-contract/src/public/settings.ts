import { z } from "zod";

import { MatchKindSchema } from "./matches";

/** Which matches a conference's attendees get, as its organiser chose. Until the organiser chooses, attendees get
 *  both kinds and every match. Every search and every text answer applies these: a kind the organiser did not
 *  choose is never returned, and no person gets more matches than the organiser allows, whatever the request asks. */
export const MatchSettingsSchema = z.strictObject({
  /** "core", "unexpected", or both. */
  kinds: z
    .array(MatchKindSchema)
    .min(1)
    .max(2)
    .refine((kinds) => new Set(kinds).size === kinds.length, "lists the same kind twice")
    .meta({ uniqueItems: true }),
  /** The most matches one person gets, from 1 to 1,000. Left out, they get all of them. */
  maxPerPerson: z.int().min(1).max(1000).optional(),
});
export type MatchSettings = z.infer<typeof MatchSettingsSchema>;
