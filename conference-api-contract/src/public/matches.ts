import { z } from "zod";

import { operational, pii, programme } from "./labels";

import { PartnerIdSchema, ProgrammeVersionSchema } from "./ids";
import { text } from "./text";

/** "core" = strong match from the person's own field; "unexpected" = strong match from a different field. */
export const MatchKindSchema = z.enum(["core", "unexpected"]);
export type MatchKind = z.infer<typeof MatchKindSchema>;

/** Opaque: 128 random bits, meaningful only to the API that issued it. */
export const PageTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);
export type PageToken = z.infer<typeof PageTokenSchema>;

const ScoreSchema = operational(z.number().min(0).max(1));
const uniqueIds = (max: number) =>
  z
    .array(PartnerIdSchema)
    .min(1)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, "lists the same id twice")
    .meta({ uniqueItems: true });

const matchFields = {
  talk: programme(PartnerIdSchema),
  kind: operational(MatchKindSchema),
  rank: operational(z.int().min(1).max(1_000_000)),
  score: ScoreSchema,
  reason: programme(text(1, 2000)),
  sharedMethods: programme(z.array(text(1, 200)).max(20)),
  programmeVersion: operational(ProgrammeVersionSchema),
};

/** A match from matches:search; "person" is present only when asking by people. */
export const MatchSchema = z.strictObject({ person: pii(PartnerIdSchema.optional()), ...matchFields });
export type Match = z.infer<typeof MatchSchema>;

/** A match from matches:fromText: it never names a person. */
export const TextMatchSchema = z.strictObject(matchFields);
export type TextMatch = z.infer<typeof TextMatchSchema>;

export const MatchesSearchRequestSchema = z
  .strictObject({
    people: pii(uniqueIds(1000).optional()),
    likeTalks: programme(uniqueIds(100).optional()),
    talks: programme(uniqueIds(1000).optional()),
    kind: operational(MatchKindSchema.optional()),
    minScore: operational(ScoreSchema.optional()),
    topPerPerson: operational(z.int().min(1).max(1000).optional()),
    pageSize: operational(z.int().min(1).max(1000).default(100)),
    pageToken: operational(PageTokenSchema.optional()),
  })
  .superRefine((req, ctx) => {
    if (req.people !== undefined && req.likeTalks !== undefined) {
      ctx.addIssue({ code: "custom", path: ["likeTalks"], message: "ask by people or by liked talks, not both" });
    }
  });
export type MatchesSearchRequest = z.infer<typeof MatchesSearchRequestSchema>;

export const MatchesSearchResponseSchema = z.strictObject({
  matches: pii(z.array(MatchSchema).max(1000)),
  nextPageToken: operational(PageTokenSchema.optional()),
});
export type MatchesSearchResponse = z.infer<typeof MatchesSearchResponseSchema>;

export const MatchesFromTextRequestSchema = z.strictObject({
  title: programme(text(1, 500).optional()),
  text: programme(text(1, 10_000)),
  kind: operational(MatchKindSchema.optional()),
  minScore: operational(ScoreSchema.optional()),
  top: operational(z.int().min(1).max(1000).optional()),
});
export type MatchesFromTextRequest = z.infer<typeof MatchesFromTextRequestSchema>;

export const MatchesFromTextResponseSchema = z
  .strictObject({
    enoughInformation: operational(z.boolean()),
    whatIsMissing: operational(text(1, 500).nullable()),
    matches: programme(z.array(TextMatchSchema).max(1000)),
  })
  .superRefine((res, ctx) => {
    if (!res.enoughInformation && res.whatIsMissing === null) {
      ctx.addIssue({ code: "custom", path: ["whatIsMissing"], message: "must say what the text lacks" });
    }
    if (!res.enoughInformation && res.matches.length > 0) {
      ctx.addIssue({ code: "custom", path: ["matches"], message: "must be empty when there is not enough information" });
    }
    if (res.enoughInformation && res.whatIsMissing !== null) {
      ctx.addIssue({ code: "custom", path: ["whatIsMissing"], message: "must be null when there is enough information" });
    }
  });
export type MatchesFromTextResponse = z.infer<typeof MatchesFromTextResponseSchema>;
