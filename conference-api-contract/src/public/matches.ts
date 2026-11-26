// Every field of a matches request, and of its answer, is checked as tightly as it can be.
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

/** The six kinds of restriction a search can ask for (the conference API's rule on restricting). */
export const RestrictionTypeSchema = z.enum(["conference", "subConference", "day", "timeBlock", "session", "talks"]);
export type RestrictionType = z.infer<typeof RestrictionTypeSchema>;

/** The restriction a result is listed under: the whole conference, one sub-conference (a track as the talks name it),
 *  day (the conference's local date), time block (when its sessions start, with the offset), session, or the set of
 *  talks the search named. */
export const RestrictionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("conference") }),
  z.strictObject({ type: z.literal("subConference"), id: text(1, 100) }),
  z.strictObject({ type: z.literal("day"), id: z.iso.date() }),
  z.strictObject({ type: z.literal("timeBlock"), id: z.iso.datetime({ offset: true }) }),
  z.strictObject({ type: z.literal("session"), id: PartnerIdSchema }),
  z.strictObject({ type: z.literal("talks") }),
]);
export type Restriction = z.infer<typeof RestrictionSchema>;

function distinct<T extends z.ZodType>(item: T, what: string) {
  return z
    .array(item)
    .min(1)
    .max(1000)
    .refine((items) => new Set(items).size === items.length, `names the same ${what} twice`)
    .meta({ uniqueItems: true });
}

/** The effective K: how many connections each of the talk's methods gets inside a restriction. Left out, it falls with
 *  the logarithm of the restriction's size. */
const EffectiveKSchema = z.int().min(1).max(100);

/** A standard restriction a search asks for: which ones of its kind, named as results name them (leave out = every
 *  one), and K. A set of talks a search names is restricted to in the same way, with its own K. */
function standard<T extends z.ZodType>(type: Exclude<RestrictionType, "conference" | "talks">, id: T) {
  return z.strictObject({ type: z.literal(type), ids: distinct(id, "one").optional(), k: EffectiveKSchema.optional() });
}
export const RestrictionRequestSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("conference"), k: EffectiveKSchema.optional() }),
  standard("subConference", text(1, 100)),
  standard("day", z.iso.date()),
  standard("timeBlock", z.iso.datetime({ offset: true })),
  standard("session", PartnerIdSchema),
  z.strictObject({ type: z.literal("talks"), ids: distinct(PartnerIdSchema, "talk"), k: EffectiveKSchema.optional() }),
]);
export type RestrictionRequest = z.infer<typeof RestrictionRequestSchema>;

/** A result listed under a restriction is a match. */
function fitsItsRestriction(result: { match: boolean; restriction?: Restriction }, ctx: z.RefinementCtx): void {
  if (result.restriction !== undefined && !result.match) {
    ctx.addIssue({ code: "custom", path: ["restriction"], message: "restrictions list only matches" });
  }
}

/** A result from matches:search, judged from the asker's talk named in "basedOn". "person" is there only when
 *  asking by people, and "restriction" only when asking with restrictions. */
export const MatchSchema = z
  .strictObject({
    person: PartnerIdSchema.optional(),
    basedOn: PartnerIdSchema,
    talk: PartnerIdSchema,
    kind: MatchKindSchema,
    rank: z.int().min(1).max(1_000_000),
    restriction: RestrictionSchema.optional(),
    score: ScoreSchema,
    ...explanationFields,
    programmeVersion: ProgrammeVersionSchema,
  })
  .superRefine(matchAgreesWithShared)
  .superRefine(fitsItsRestriction);
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
    restrictions: z
      .array(RestrictionRequestSchema)
      .min(1)
      .max(RestrictionTypeSchema.options.length)
      .refine((all) => new Set(all.map((r) => r.type)).size === all.length, "names the same kind of restriction twice")
      .meta({ uniqueItems: true })
      .optional(),
    pageSize: z.int().min(1).max(1000).default(100),
    pageToken: PageTokenSchema.optional(),
  })
  .superRefine((request, ctx) => {
    if (request.people !== undefined && request.likeTalks !== undefined) {
      ctx.addIssue({ code: "custom", path: ["likeTalks"], message: "ask by people or by liked talks, not both" });
    }
    if (request.restrictions === undefined) return;
    if (request.people === undefined && request.likeTalks === undefined) {
      ctx.addIssue({ code: "custom", path: ["restrictions"], message: "restrict the matches of named people or liked talks" });
    }
    if (request.include === "all") {
      ctx.addIssue({ code: "custom", path: ["include"], message: "restrictions list only matches" });
    }
    if (request.topPerPerson !== undefined) {
      ctx.addIssue({ code: "custom", path: ["topPerPerson"], message: "restrictions set how many each gives" });
    }
  });
export type MatchesSearchRequest = z.infer<typeof MatchesSearchRequestSchema>;

/** A restriction still being judged for one of the asker's talks: ask again later for its matches. */
export const JudgingSchema = z.strictObject({ basedOn: PartnerIdSchema, restriction: RestrictionSchema });

export const MatchesSearchResponseSchema = z.strictObject({
  matches: z.array(MatchSchema).max(1000),
  judging: z.array(JudgingSchema).max(10_000).optional(),
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
