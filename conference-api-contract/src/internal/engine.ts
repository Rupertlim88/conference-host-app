// What the data layer and the matching engines pass to each other is fixed.
import { z } from "zod";

import { JobIdSchema, PartnerIdSchema, ProgrammeVersionSchema } from "../public/ids";
import { MatchKindSchema, RestrictionSchema, explanationFields, matchAgreesWithShared } from "../public/matches";
import { text } from "../public/text";

/** The data layer's own ID for a talk. */
const InternalIdSchema = z.int().min(1).max(Number.MAX_SAFE_INTEGER);

/** What an engine may read of a talk: id, title, abstract, tracks, keywords, and its session and the session's start
 *  (null when the talk was sent without them), as the talk was sent. The author and presenter IDs let the run driver
 *  drop talks the anchor's presenters wrote; engines never read them. Talk and person IDs are the data layer's own. */
export const EngineTalkSchema = z
  .strictObject({
    id: InternalIdSchema,
    title: text(1, 500),
    abstract: text(1, 10_000),
    tracks: z.array(text(1, 100)).max(20),
    keywords: z.array(text(1, 100)).max(50),
    session: z.strictObject({ id: PartnerIdSchema, start: z.iso.datetime({ offset: true }).nullable() }).nullable(),
    authorIds: z.array(InternalIdSchema).max(200),
    presenterIds: z.array(InternalIdSchema).max(200),
  })
  .refine((talk) => talk.presenterIds.every((id) => talk.authorIds.includes(id)), {
    path: ["presenterIds"],
    message: "every presenter is among the authors",
  });
export type EngineTalk = z.infer<typeof EngineTalkSchema>;

/** Every talk that can be recommended (not withdrawn or cancelled), as of one programme version. The version is
 *  null only before the conference has sent any talks. */
export const CorpusSchema = z.strictObject({
  programmeVersion: ProgrammeVersionSchema.nullable(),
  talks: z.array(EngineTalkSchema).max(100_000),
});
export type Corpus = z.infer<typeof CorpusSchema>;

/** Names an engine in the registry; matches from several engines are stored side by side. */
export const EngineIdSchema = z.string().regex(/^[a-z0-9_]{1,64}$/);

/** Which engine, at which version and with which AI models, produced a set of matches. */
export const RunInfoSchema = z.strictObject({
  engineId: EngineIdSchema,
  engineVersion: z.string().regex(/^[A-Za-z0-9_.+-]{1,64}$/),
  runId: z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),
  models: z
    .record(z.string().regex(/^[a-z0-9_]{1,64}$/), z.string().regex(/^[A-Za-z0-9_.:/@-]{1,200}$/))
    .refine((models) => Object.keys(models).length <= 20, "at most 20 models")
    .meta({ maxProperties: 20 }),
});
export type RunInfo = z.infer<typeof RunInfoSchema>;

/** These talks changed: recompute every match between one of them and any other talk, in either direction. */
export const MatchingJobSchema = z.strictObject({
  job: JobIdSchema,
  programmeVersion: ProgrammeVersionSchema,
  talks: z.array(InternalIdSchema).min(1).max(100_000),
});
export type MatchingJob = z.infer<typeof MatchingJobSchema>;

/** One engine judgment from an anchor talk to a candidate: match or not, what the two share, and the description
 *  written from the anchor's side. The data layer ranks results when it serves them. */
export const MatchPairSchema = z
  .strictObject({
    anchor: InternalIdSchema,
    candidate: InternalIdSchema,
    score: z.number().min(0).max(1),
    kind: MatchKindSchema,
    ...explanationFields,
  })
  .superRefine(matchAgreesWithShared)
  .refine((match) => match.anchor !== match.candidate, { path: ["candidate"], message: "a talk is never matched with itself" });
export type MatchPair = z.infer<typeof MatchPairSchema>;

/** One engine judgment that a candidate talk matches a person's own text. */
export const EngineTextMatchSchema = z.strictObject({
  candidate: InternalIdSchema,
  score: z.number().min(0).max(1),
  kind: MatchKindSchema,
  reason: text(1, 2000),
  sharedMethods: z.array(text(1, 200)).max(20),
});
export type EngineTextMatch = z.infer<typeof EngineTextMatchSchema>;

/** A check that no two items in a list share a key; each repeat is reported at its own index. */
function noRepeatedKeys<T>(keyOf: (item: T) => string, message: string) {
  return (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const key = keyOf(item);
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: [index], message });
      seen.add(key);
    });
  };
}

/** A finished matching job: every match involving the job's talks, which replace their old matches all at once.
 *  The programme version is the one the engine read, which is never older than the job's. */
export const CompleteMatchingJobSchema = z.strictObject({
  job: JobIdSchema,
  programmeVersion: ProgrammeVersionSchema,
  run: RunInfoSchema,
  matches: z
    .array(MatchPairSchema)
    .max(1_000_000)
    .superRefine(noRepeatedKeys((match) => `${match.anchor}>${match.candidate}`, "this pair of talks is already listed")),
});
export type CompleteMatchingJob = z.infer<typeof CompleteMatchingJobSchema>;

/** Match a person's own text against the programme, on the spot. */
/** A restriction to judge for one talk, the first time a search asks for it: the talks the restriction holds, by the
 *  data layer's IDs, never the talk itself; and either K, the connections each of the talk's methods gets inside it
 *  (null: the engine works K out from the restriction's size), or every talk in it, for a set of talks a search named. */
export const RestrictionJobSchema = z
  .strictObject({
    id: JobIdSchema,
    programmeVersion: ProgrammeVersionSchema,
    anchor: InternalIdSchema,
    restriction: RestrictionSchema,
    among: z
      .array(InternalIdSchema)
      .min(1)
      .max(100_000)
      .refine((ids) => new Set(ids).size === ids.length, "lists a talk twice")
      .meta({ uniqueItems: true }),
    k: z.int().min(1).max(100).nullable(),
    every: z.boolean(),
  })
  .superRefine((job, ctx) => {
    if (job.among.includes(job.anchor)) ctx.addIssue({ code: "custom", path: ["among"], message: "never the talk itself" });
    if (job.every && job.k !== null) ctx.addIssue({ code: "custom", path: ["k"], message: "every talk is judged: no K" });
  });
export type RestrictionJob = z.infer<typeof RestrictionJobSchema>;

/** The pairs an engine judged for a restriction job, each in both directions. */
export const RestrictionResultSchema = z.strictObject({
  id: JobIdSchema,
  programmeVersion: ProgrammeVersionSchema,
  run: RunInfoSchema,
  matches: z.array(MatchPairSchema).max(1_000_000),
});
export type RestrictionResult = z.infer<typeof RestrictionResultSchema>;

export const TextMatchJobSchema = z.strictObject({
  id: JobIdSchema,
  programmeVersion: ProgrammeVersionSchema.nullable(),
  title: text(1, 500).nullable(),
  text: text(1, 10_000),
  kind: MatchKindSchema.optional(),
  minScore: z.number().min(0).max(1).optional(),
  top: z.int().min(1).max(1000).optional(),
});
export type TextMatchJob = z.infer<typeof TextMatchJobSchema>;

export const TextMatchResultSchema = z
  .strictObject({
    id: JobIdSchema,
    programmeVersion: ProgrammeVersionSchema.nullable(),
    run: RunInfoSchema,
    enoughInformation: z.boolean(),
    whatIsMissing: text(1, 500).nullable(),
    matches: z
      .array(EngineTextMatchSchema)
      .max(1000)
      .superRefine(noRepeatedKeys((match) => String(match.candidate), "this talk is already listed")),
  })
  .superRefine((result, ctx) => {
    if (!result.enoughInformation && result.whatIsMissing === null) {
      ctx.addIssue({ code: "custom", path: ["whatIsMissing"], message: "must say what the text lacks" });
    }
    if (!result.enoughInformation && result.matches.length > 0) {
      ctx.addIssue({ code: "custom", path: ["matches"], message: "must be empty when there is not enough information" });
    }
    if (result.enoughInformation && result.whatIsMissing !== null) {
      ctx.addIssue({ code: "custom", path: ["whatIsMissing"], message: "must be null when there is enough information" });
    }
  });
export type TextMatchResult = z.infer<typeof TextMatchResultSchema>;
