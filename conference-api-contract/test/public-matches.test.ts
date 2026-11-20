import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { z } from "zod";

import {
  MatchesFromTextRequestSchema,
  MatchesFromTextResponseSchema,
  MatchesSearchRequestSchema,
  MatchesSearchResponseSchema,
} from "../src/public/index";

const FIXTURES = join(import.meta.dirname, "..", "fixtures", "public");
const read = (p: string) => JSON.parse(readFileSync(join(FIXTURES, p), "utf8"));

function issuePaths(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.flatMap((i) => [
    i.path.join("."),
    ...("keys" in i ? (i.keys as string[]).map((k) => [...i.path, k].join(".")) : []),
  ]);
}

const searchMatch = read("valid/matches_search_response.json").matches[0];
const textMatch = read("valid/matches_from_text_response.json").matches[0];

describe("valid examples parse", () => {
  test("search request", () =>
    expect(MatchesSearchRequestSchema.safeParse(read("valid/matches_search_request.json")).success).toBe(true));
  test("search response", () =>
    expect(MatchesSearchResponseSchema.safeParse(read("valid/matches_search_response.json")).success).toBe(true));
  test("fromText request", () =>
    expect(MatchesFromTextRequestSchema.safeParse(read("valid/matches_from_text_request.json")).success).toBe(true));
  test("fromText response", () =>
    expect(MatchesFromTextResponseSchema.safeParse(read("valid/matches_from_text_response.json")).success).toBe(true));
  test("an empty search asks for everyone's matches", () =>
    expect(MatchesSearchRequestSchema.safeParse({}).success).toBe(true));
  test("a last page has no next token", () =>
    expect(MatchesSearchResponseSchema.safeParse({ matches: [searchMatch] }).success).toBe(true));
});

describe("matches:search", () => {
  test("refuses people and likeTalks together", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { people: ["P1"], likeTalks: ["T42"] })).toContain("likeTalks"));
  test("pageSize is 1 to 1,000 and defaults to 100", () => {
    expect(MatchesSearchRequestSchema.parse({}).pageSize).toBe(100);
    expect(issuePaths(MatchesSearchRequestSchema, { pageSize: 0 })).toContain("pageSize");
    expect(issuePaths(MatchesSearchRequestSchema, { pageSize: 1001 })).toContain("pageSize");
    expect(MatchesSearchRequestSchema.safeParse({ pageSize: 1000 }).success).toBe(true);
  });
  test("minScore is 0 to 1", () => {
    expect(issuePaths(MatchesSearchRequestSchema, { minScore: -0.01 })).toContain("minScore");
    expect(issuePaths(MatchesSearchRequestSchema, { minScore: 1.01 })).toContain("minScore");
  });
  test("refuses a kind outside core and unexpected", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { kind: "both" })).toContain("kind"));
  test("refuses more than 100 liked talks", () =>
    expect(
      issuePaths(MatchesSearchRequestSchema, { likeTalks: Array.from({ length: 101 }, (_, i) => `T${i}`) }),
    ).toContain("likeTalks"));
  test("refuses a page token that is not one of ours", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { pageToken: "abc" })).toContain("pageToken"));
  test("refuses a score above 1 in a match", () =>
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, score: 1.5 }] })).toContain(
      "matches.0.score",
    ));
});

describe("matches:fromText", () => {
  test("refuses whitespace-only text", () =>
    expect(issuePaths(MatchesFromTextRequestSchema, { text: " \n " })).toContain("text"));
  test("refuses a missing text", () => expect(issuePaths(MatchesFromTextRequestSchema, {})).toContain("text"));
  test("not enough information needs a reason", () =>
    expect(
      issuePaths(MatchesFromTextResponseSchema, { enoughInformation: false, whatIsMissing: null, matches: [] }),
    ).toContain("whatIsMissing"));
  test("not enough information means no matches", () =>
    expect(
      issuePaths(MatchesFromTextResponseSchema, {
        enoughInformation: false,
        whatIsMissing: "a clear research method",
        matches: [textMatch],
      }),
    ).toContain("matches"));
  test("enough information means nothing is missing", () =>
    expect(
      issuePaths(MatchesFromTextResponseSchema, { enoughInformation: true, whatIsMissing: "x", matches: [] }),
    ).toContain("whatIsMissing"));
  test("a fromText match never names a person", () =>
    expect(
      MatchesFromTextResponseSchema.safeParse({
        enoughInformation: true,
        whatIsMissing: null,
        matches: [{ ...textMatch, person: "P1" }],
      }).success,
    ).toBe(false));
});

const EXPECTED_PATH: Record<string, string> = {
  "matches_search_request-people-and-like-talks.json": "likeTalks",
  "matches_search_request-page-size-zero.json": "pageSize",
  "matches_search_response-score-above-one.json": "matches.0.score",
  "matches_from_text_request-blank-text.json": "text",
  "matches_from_text_response-not-enough-with-matches.json": "matches",
};
const SCHEMA_OF: Record<string, z.ZodType> = {
  matches_search_request: MatchesSearchRequestSchema,
  matches_search_response: MatchesSearchResponseSchema,
  matches_from_text_request: MatchesFromTextRequestSchema,
  matches_from_text_response: MatchesFromTextResponseSchema,
};

describe("every invalid fixture fails at its stated path", () => {
  for (const [file, path] of Object.entries(EXPECTED_PATH)) {
    test(file, () => {
      const schema = SCHEMA_OF[file.split("-")[0]!]!;
      expect(issuePaths(schema, read(`invalid/${file}`))).toContain(path);
    });
  }
});
