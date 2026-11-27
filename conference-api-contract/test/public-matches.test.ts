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
  test("search request with restrictions", () =>
    expect(MatchesSearchRequestSchema.safeParse(read("valid/matches_search_request-restrictions.json")).success).toBe(true));
  test("search response with restrictions", () =>
    expect(MatchesSearchResponseSchema.safeParse(read("valid/matches_search_response-restrictions.json")).success).toBe(true));
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
  test("include is matches or all, and may be left out", () => {
    expect(MatchesSearchRequestSchema.safeParse({ include: "all" }).success).toBe(true);
    expect(MatchesSearchRequestSchema.safeParse({ include: "matches" }).success).toBe(true);
    expect(issuePaths(MatchesSearchRequestSchema, { include: "some" })).toContain("include");
  });
  test("a result names the asker's talk it is judged from", () => {
    const without = { ...searchMatch };
    delete without.basedOn;
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [without] })).toContain("matches.0.basedOn");
  });
  test("a result is a match exactly when the two share something", () => {
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, shared: [] }] })).toContain(
      "matches.0.match",
    );
    expect(
      issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, match: false, shared: ["intent"] }] }),
    ).toContain("matches.0.match");
    expect(
      MatchesSearchResponseSchema.safeParse({ matches: [{ ...searchMatch, match: false, shared: [] }] }).success,
    ).toBe(true);
  });
  test("shared names the intent and the technique at most once each, in that order", () => {
    expect(
      MatchesSearchResponseSchema.safeParse({ matches: [{ ...searchMatch, shared: ["intent", "technique"] }] }).success,
    ).toBe(true);
    for (const shared of [["technique", "intent"], ["intent", "intent"], ["method"]]) {
      expect(issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, shared }] }).join(" "), String(shared))
        .toContain("matches.0.shared");
    }
  });
  test("a description is 1 to 800 characters", () => {
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, description: "x".repeat(801) }] })).toContain(
      "matches.0.description",
    );
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, description: " " }] })).toContain(
      "matches.0.description",
    );
  });
  test("each linked method gives the intent and the technique of both talks, at most 20 pairs", () => {
    const pair = searchMatch.methods[0];
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, methods: [{ this: pair.this }] }] })).toContain(
      "matches.0.methods.0.other",
    );
    expect(
      issuePaths(MatchesSearchResponseSchema, {
        matches: [{ ...searchMatch, methods: [{ ...pair, other: { ...pair.other, intent: "x".repeat(2001) } }] }],
      }),
    ).toContain("matches.0.methods.0.other.intent");
    expect(
      issuePaths(MatchesSearchResponseSchema, { matches: [{ ...searchMatch, methods: Array.from({ length: 21 }, () => pair) }] }),
    ).toContain("matches.0.methods");
  });
  test("a search result has no reason or sharedMethods any more", () =>
    expect(
      MatchesSearchResponseSchema.safeParse({ matches: [{ ...searchMatch, reason: "r", sharedMethods: [] }] }).success,
    ).toBe(false));
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
  test("a fromText match keeps its reason and shared methods", () =>
    expect(Object.keys(textMatch)).toEqual(expect.arrayContaining(["reason", "sharedMethods"])));
  test("a fromText match never names a person", () =>
    expect(
      MatchesFromTextResponseSchema.safeParse({
        enoughInformation: true,
        whatIsMissing: null,
        matches: [{ ...textMatch, person: "P1" }],
      }).success,
    ).toBe(false));
});

describe("matches:search with restrictions", () => {
  const restricted = { ...searchMatch, restriction: { type: "session", id: "G21" } };
  const asking = (restrictions: unknown[], extra: object = {}) => ({ likeTalks: ["T42"], restrictions, ...extra });
  test("a search can restrict to any of the five standard kinds, each with which ones and its own K", () =>
    expect(
      MatchesSearchRequestSchema.safeParse(
        asking([
          { type: "conference", k: 2 },
          { type: "subConference", ids: ["Hydrology", "Radar"] },
          { type: "day", ids: ["2027-01-11"], k: 1 },
          { type: "timeBlock", ids: ["2027-01-11T08:30:00-06:00"] },
          { type: "session" },
        ]),
      ).success,
    ).toBe(true));
  test("a search can restrict to a set of talks it names, with its own K like any restriction", () => {
    expect(MatchesSearchRequestSchema.safeParse(asking([{ type: "talks", ids: ["T1", "T2"] }])).success).toBe(true);
    expect(MatchesSearchRequestSchema.safeParse(asking([{ type: "talks", ids: ["T1"], k: 2 }])).success).toBe(true);
    expect(MatchesSearchRequestSchema.safeParse(asking([{ type: "talks" }])).success).toBe(false);
  });
  test("refuses a restriction outside the six kinds", () =>
    expect(MatchesSearchRequestSchema.safeParse(asking([{ type: "building" }])).success).toBe(false));
  test("names each kind of restriction at most once, and each one of a kind at most once", () => {
    expect(issuePaths(MatchesSearchRequestSchema, asking([{ type: "day" }, { type: "day", k: 1 }]))).toContain("restrictions");
    expect(issuePaths(MatchesSearchRequestSchema, asking([{ type: "session", ids: ["S1", "S1"] }]))).toContain(
      "restrictions.0.ids",
    );
  });
  test("sets K, when it sets it, to at least one", () =>
    expect(issuePaths(MatchesSearchRequestSchema, asking([{ type: "session", k: 0 }]))).toContain("restrictions.0.k"));
  test("names restrictions in the form results give them, and the whole conference by no id", () => {
    expect(MatchesSearchRequestSchema.safeParse(asking([{ type: "day", ids: ["2027-01-11T08:30:00-06:00"] }])).success).toBe(false);
    expect(MatchesSearchRequestSchema.safeParse(asking([{ type: "timeBlock", ids: ["2027-01-11T08:30:00"] }])).success).toBe(false);
    expect(MatchesSearchRequestSchema.safeParse(asking([{ type: "conference", ids: ["x"] }])).success).toBe(false);
  });
  test("restricts the matches of named people or liked talks, never of everyone", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { restrictions: [{ type: "day" }] })).toContain("restrictions"));
  test("lists only matches, and sets no cap per person", () => {
    expect(issuePaths(MatchesSearchRequestSchema, asking([{ type: "day" }], { include: "all" }))).toContain("include");
    expect(issuePaths(MatchesSearchRequestSchema, asking([{ type: "day" }], { topPerPerson: 3 }))).toContain("topPerPerson");
  });
  test("a result says which restriction it is listed under", () => {
    for (const restriction of [
      { type: "conference" },
      { type: "subConference", id: "Hydrology" },
      { type: "day", id: "2027-01-11" },
      { type: "timeBlock", id: "2027-01-11T08:30:00-06:00" },
      { type: "session", id: "G21" },
      { type: "talks" },
    ]) {
      expect(MatchesSearchResponseSchema.safeParse({ matches: [{ ...searchMatch, restriction }] }).success).toBe(true);
    }
  });
  test("a result listed under any restriction is a match", () => {
    expect(
      issuePaths(MatchesSearchResponseSchema, { matches: [{ ...restricted, match: false, shared: [] }] }),
    ).toContain("matches.0.restriction");
    const named = { ...searchMatch, match: false, shared: [], restriction: { type: "talks" } };
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [named] })).toContain("matches.0.restriction");
  });
  test("an answer lists the restrictions still being judged, for each talk they restrict", () => {
    const judging = [{ basedOn: "T42", restriction: { type: "timeBlock", id: "2027-01-11T08:30:00-06:00" } }];
    expect(MatchesSearchResponseSchema.safeParse({ matches: [], judging }).success).toBe(true);
    expect(MatchesSearchResponseSchema.safeParse({ matches: [], judging: [{ restriction: { type: "day" } }] }).success).toBe(
      false,
    );
  });
});

const EXPECTED_PATH: Record<string, string> = {
  "matches_search_request-people-and-like-talks.json": "likeTalks",
  "matches_search_request-page-size-zero.json": "pageSize",
  "matches_search_response-score-above-one.json": "matches.0.score",
  "matches_search_response-description-too-long.json": "matches.0.description",
  "matches_search_response-match-without-shared.json": "matches.0.match",
  "matches_search_request-include-unknown.json": "include",
  "matches_from_text_request-blank-text.json": "text",
  "matches_from_text_response-not-enough-with-matches.json": "matches",
  "matches_search_request-restrictions-with-all.json": "include",
  "matches_search_request-restriction-twice.json": "restrictions",
  "matches_search_request-restrictions-for-everyone.json": "restrictions",
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
