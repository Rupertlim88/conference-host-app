// Every shape the parts pass to each other has a JSON Schema, for the Python side.
import { z } from "zod";

import { KeyHolderSchema } from "./control";
import {
  SearchMatchesOutcomeSchema,
  SearchMatchesQuerySchema,
  TextRequestCommandSchema,
  WriteTalksCommandSchema,
  WriteTalksOutcomeSchema,
} from "./data";
import { ConferenceListSchema } from "./databases";
import {
  CompleteMatchingJobSchema,
  CorpusSchema,
  EngineTalkSchema,
  MatchingJobSchema,
  TextMatchJobSchema,
  TextMatchResultSchema,
} from "./engine";

export * from "./control";
export * from "./data";
export * from "./databases";
export * from "./engine";

/** Every shape the conference API's parts pass to each other, by kind. */
export const INTERNAL_SCHEMAS = {
  key_holder: KeyHolderSchema,
  conference_list: ConferenceListSchema,
  write_talks_command: WriteTalksCommandSchema,
  write_talks_outcome: WriteTalksOutcomeSchema,
  search_matches_query: SearchMatchesQuerySchema,
  search_matches_outcome: SearchMatchesOutcomeSchema,
  text_request_command: TextRequestCommandSchema,
  engine_talk: EngineTalkSchema,
  corpus: CorpusSchema,
  matching_job: MatchingJobSchema,
  complete_matching_job: CompleteMatchingJobSchema,
  text_match_job: TextMatchJobSchema,
  text_match_result: TextMatchResultSchema,
} as const;
export type InternalKind = keyof typeof INTERNAL_SCHEMAS;

/** The JSON Schema (draft 2020-12) of every internal kind, for the Python side. */
export function emitInternal(): Record<InternalKind, Record<string, unknown>> {
  const entries = Object.entries(INTERNAL_SCHEMAS).map(([kind, schema]) => [
    kind,
    z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" }),
  ]);
  return Object.fromEntries(entries) as Record<InternalKind, Record<string, unknown>>;
}
