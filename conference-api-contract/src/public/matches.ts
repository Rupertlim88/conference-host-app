import { z } from "zod";

import { PartnerIdSchema, ProgrammeVersionSchema } from "./ids";
import { text } from "./text";

/** "core": a strong match from the person's own field. "unexpected": a strong match from a different field. */
export const MatchKindSchema = z.enum(["core", "unexpected"]);
export type MatchKind = z.infer<typeof MatchKindSchema>;

/** Opaque: 128 random bits, meaningful only to the API that issued it. */
export const PageTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);
export type PageToken = z.infer<typeof PageTokenSchema>;

const ScoreSchema = z.number().min(0).max(1);

function distinctIds(max: number) {
  return z
    .array(PartnerIdSchema)
    .min(1)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, "lists the same id twice")
    .meta({ uniqueItems: true });
}

const matchFields = {
  talk: PartnerIdSchema,
  kind: MatchKindSchema,
  rank: z.int().min(1).max(1_000_000),
  score: ScoreSchema,
  reason: text(1, 2000),
  sharedMethods: z.array(text(1, 200)).max(20),
  programmeVersion: ProgrammeVersionSchema,
};

/** A match from matches:search. "person" is there only when asking by people. */
export const MatchSchema = z.strictObject({ person: PartnerIdSchema.optional(), ...matchFields });
export type Match = z.infer<typeof MatchSchema>;

/** A match from matches:fromText, which never names a person. */
export const TextMatchSchema = z.strictObject(matchFields);
export type TextMatch = z.infer<typeof TextMatchSchema>;

export const MatchesSearchRequestSchema = z
  .strictObject({
    people: distinctIds(1000).optional(),
    likeTalks: distinctIds(100).optional(),
    talks: distinctIds(1000).optional(),
    kind: MatchKindSchema.optional(),
    minScore: ScoreSchema.optional(),
    topPerPerson: z.int().min(1).max(1000).optional(),
    pageSize: z.int().min(1).max(1000).default(100),
    pageToken: PageTokenSchema.optional(),
  })
  .superRefine((request, ctx) => {
    if (request.people !== undefined && request.likeTalks !== undefined) {
      ctx.addIssue({ code: "custom", path: ["likeTalks"], message: "ask by people or by liked talks, not both" });
    }
  });
export type MatchesSearchRequest = z.infer<typeof MatchesSearchRequestSchema>;

export const MatchesSearchResponseSchema = z.strictObject({
  matches: z.array(MatchSchema).max(1000),
  nextPageToken: PageTokenSchema.optional(),
});
export type MatchesSearchResponse = z.infer<typeof MatchesSearchResponseSchema>;

export const MatchesFromTextRequestSchema = z.strictObject({
  title: text(1, 500).optional(),
  text: text(1, 10_000),
  kind: MatchKindSchema.optional(),
  minScore: ScoreSchema.optional(),
  top: z.int().min(1).max(1000).optional(),
});
export type MatchesFromTextRequest = z.infer<typeof MatchesFromTextRequestSchema>;

/** Either the text held enough to match, with no word on what is missing, or it did not, with no matches and a
 *  reason. */
export const MatchesFromTextResponseSchema = z
  .strictObject({
    enoughInformation: z.boolean(),
    whatIsMissing: text(1, 500).nullable(),
    matches: z.array(TextMatchSchema).max(1000),
  })
  .superRefine((answer, ctx) => {
    if (!answer.enoughInformation && answer.whatIsMissing === null) {
      ctx.addIssue({ code: "custom", path: ["whatIsMissing"], message: "must say what the text lacks" });
    }
    if (!answer.enoughInformation && answer.matches.length > 0) {
      ctx.addIssue({ code: "custom", path: ["matches"], message: "must be empty when there is not enough information" });
    }
    if (answer.enoughInformation && answer.whatIsMissing !== null) {
      ctx.addIssue({ code: "custom", path: ["whatIsMissing"], message: "must be null when there is enough information" });
    }
  });
export type MatchesFromTextResponse = z.infer<typeof MatchesFromTextResponseSchema>;
