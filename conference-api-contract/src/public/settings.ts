import { z } from "zod";

import { operational } from "./labels";

import { MatchKindSchema } from "./matches";

/** Which matches a conference's attendees get, as its organiser chose. Until the organiser chooses, attendees
 *  get both kinds and every match. The API applies these to every search and every text answer: a request for
 *  a kind the organiser did not choose gets no matches of it, and no person gets more than the organiser
 *  allows, whatever the request asks. */
export const MatchSettingsSchema = z.strictObject({
  /** "core", "unexpected", or both. */
  kinds: operational(
    z
      .array(MatchKindSchema)
      .min(1)
      .max(2)
      .refine((kinds) => new Set(kinds).size === kinds.length, "lists the same kind twice")
      .meta({ uniqueItems: true }),
  ),
  /** The most matches one person gets, from 1 to 1,000. Leave out for all of them. */
  maxPerPerson: operational(z.int().min(1).max(1000).optional()),
});
export type MatchSettings = z.infer<typeof MatchSettingsSchema>;
