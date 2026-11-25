import { z } from "zod";

import { explanationFields, matchAgreesWithShared } from "./public/matches";

export const CONTRACT_VERSION = 1;

/** One engine judgment from an anchor talk to a candidate talk: match or not, what the two share, and the
 *  description written from the anchor's side. IDs only: the data layer joins the talks' fields. */
export const RecommendationSchema = z
  .strictObject({
    for_talk_id: z.int().min(0),
    candidate_id: z.int().min(1),
    score: z.number().min(0).max(1),
    rank: z.int().min(1),
    match: explanationFields.match,
    cross_domain: z.boolean(),
    shared: explanationFields.shared,
    description: explanationFields.description,
    methods: explanationFields.methods,
    evidence: z.record(z.string(), z.unknown()),
    engine_id: z.string().regex(/^[a-z0-9_]+$/),
    run_id: z.string().min(1),
    contract_version: z.literal(CONTRACT_VERSION),
  })
  .superRefine(matchAgreesWithShared)
  .meta({ id: "Recommendation", title: "Recommendation" });

export type Recommendation = z.infer<typeof RecommendationSchema>;
