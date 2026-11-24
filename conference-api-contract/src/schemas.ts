import { z } from "zod";

import { AgendaResponseSchema, PicksResponseSchema, SubjectSchema } from "./api";
import { RecommendationSchema } from "./recommendation";
import { RunSchema } from "./run";
import { TalkSchema } from "./talk";

export const SCHEMAS = {
  talk: TalkSchema,
  recommendation: RecommendationSchema,
  run: RunSchema,
  subject: SubjectSchema,
  picks_response: PicksResponseSchema,
  agenda_response: AgendaResponseSchema,
} as const;
export type SchemaKind = keyof typeof SCHEMAS;

/** The JSON Schema (draft 2020-12) of every contract kind, by kind. */
export function emitAll(): Record<SchemaKind, Record<string, unknown>> {
  const entries = Object.entries(SCHEMAS).map(([kind, schema]) => [kind, z.toJSONSchema(schema, { target: "draft-2020-12" })]);
  return Object.fromEntries(entries) as Record<SchemaKind, Record<string, unknown>>;
}
