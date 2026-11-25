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

/** What two talks can share: the intent, the principle their approach relies on, and the technique, how they do
 *  their core step. */
export const SharedSideSchema = z.enum(["intent", "technique"]);
const SIDE_ORDER = SharedSideSchema.options;

const SharedSchema = z
  .array(SharedSideSchema)
  .max(2)
  .refine(
    (sides) => sides.every((side, i) => i === 0 || SIDE_ORDER.indexOf(side) > SIDE_ORDER.indexOf(sides[i - 1]!)),
    "names the intent, then the technique, each at most once",
  )
  .meta({ uniqueItems: true });

const MethodSideSchema = z.strictObject({ intent: text(1, 2000), technique: text(1, 2000) });

/** A pair of linked methods: the one in the talk the result is judged from, and the one in the other talk. */
export const LinkedMethodsSchema = z.strictObject({ this: MethodSideSchema, other: MethodSideSchema });

/** How a result explains itself: match or not, what the two talks share, and a description written from the side
 *  of the talk the result is judged from. Shared by the public result and the engines' internal one. */
export const explanationFields = {
  match: z.boolean(),
  shared: SharedSchema,
  description: text(1, 800),
  methods: z.array(LinkedMethodsSchema).max(20),
};

/** Two talks are a match exactly when they share the intent, the technique or both. */
export function matchAgreesWithShared(result: { match: boolean; shared: string[] }, ctx: z.RefinementCtx): void {
  if (result.match !== result.shared.length > 0) {
    ctx.addIssue({ code: "custom", path: ["match"], message: "is true exactly when the two talks share something" });
  }
}

/** A result from matches:search, judged from the asker's talk named in "basedOn". "person" is there only when
 *  asking by people. */
export const MatchSchema = z
  .strictObject({
    person: PartnerIdSchema.optional(),
    basedOn: PartnerIdSchema,
    talk: PartnerIdSchema,
    kind: MatchKindSchema,
    rank: z.int().min(1).max(1_000_000),
    score: ScoreSchema,
    ...explanationFields,
    programmeVersion: ProgrammeVersionSchema,
  })
  .superRefine(matchAgreesWithShared);
export type Match = z.infer<typeof MatchSchema>;

/** A match from matches:fromText, which never names a person. */
export const TextMatchSchema = z.strictObject({
  talk: PartnerIdSchema,
  kind: MatchKindSchema,
  rank: z.int().min(1).max(1_000_000),
  score: ScoreSchema,
  reason: text(1, 2000),
  sharedMethods: z.array(text(1, 200)).max(20),
  programmeVersion: ProgrammeVersionSchema,
});
export type TextMatch = z.infer<typeof TextMatchSchema>;

export const MatchesSearchRequestSchema = z
  .strictObject({
    people: distinctIds(1000).optional(),
    likeTalks: distinctIds(100).optional(),
    talks: distinctIds(1000).optional(),
    include: z.enum(["matches", "all"]).optional(),
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
