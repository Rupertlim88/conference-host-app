import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { z } from "zod";

import {
  MatchesFromTextRequestSchema,
  MatchesFromTextResponseSchema,
  MatchesSearchRequestSchema,
  MatchesSearchResponseSchema,
  POOL_SIZES,
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
  test("search request with pools", () =>
    expect(MatchesSearchRequestSchema.safeParse(read("valid/matches_search_request-pools.json")).success).toBe(true));
  test("search response with pools", () =>
    expect(MatchesSearchResponseSchema.safeParse(read("valid/matches_search_response-pools.json")).success).toBe(true));
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

describe("matches:search with pools", () => {
  const pooled = { ...searchMatch, pool: { type: "session", id: "G21" } };
  test("a search can ask for any of the five kinds of pool, each with which pools and how many from each", () =>
    expect(
      MatchesSearchRequestSchema.safeParse({
        pools: [
          { type: "conference", count: 5 },
          { type: "subConference", ids: ["Hydrology", "Radar"], count: 1 },
          { type: "day", ids: ["2027-01-11"], count: 3 },
          { type: "timeBlock", ids: ["2027-01-11T08:30:00-06:00", "2027-01-11T10:30:00-06:00"], count: 2 },
          { type: "session" },
        ],
      }).success,
    ).toBe(true));
  test("refuses a pool outside the five kinds", () =>
    expect(MatchesSearchRequestSchema.safeParse({ pools: [{ type: "building" }] }).success).toBe(false));
  test("names each kind of pool at most once", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { pools: [{ type: "day" }, { type: "day", count: 1 }] })).toContain(
      "pools",
    ));
  test("names each pool of a kind at most once", () =>
    expect(
      issuePaths(MatchesSearchRequestSchema, { pools: [{ type: "session", ids: ["S1", "S1"] }] }),
    ).toContain("pools.0.ids"));
  test("asks for at least one match from each pool and no more than its kind lists", () => {
    expect(MatchesSearchRequestSchema.safeParse({ pools: [{ type: "conference", count: 10 }] }).success).toBe(true);
    expect(issuePaths(MatchesSearchRequestSchema, { pools: [{ type: "conference", count: 11 }] })).toContain("pools.0.count");
    expect(issuePaths(MatchesSearchRequestSchema, { pools: [{ type: "timeBlock", count: 3 }] })).toContain("pools.0.count");
    expect(issuePaths(MatchesSearchRequestSchema, { pools: [{ type: "session", count: 0 }] })).toContain("pools.0.count");
  });
  test("names pools in the form results give them, and the whole conference by no id", () => {
    expect(MatchesSearchRequestSchema.safeParse({ pools: [{ type: "day", ids: ["2027-01-11T08:30:00-06:00"] }] }).success).toBe(false);
    expect(MatchesSearchRequestSchema.safeParse({ pools: [{ type: "timeBlock", ids: ["2027-01-11T08:30:00"] }] }).success).toBe(false);
    expect(MatchesSearchRequestSchema.safeParse({ pools: [{ type: "conference", ids: ["x"] }] }).success).toBe(false);
  });
  test("lists only matches", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { pools: [{ type: "day" }], include: "all" })).toContain("include"));
  test("sets no cap per person", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { pools: [{ type: "day" }], topPerPerson: 3 })).toContain(
      "topPerPerson",
    ));
  test("has no separate cap per pool: the count of each kind is that cap", () =>
    expect(MatchesSearchRequestSchema.safeParse({ pools: [{ type: "day" }], perPool: 1 }).success).toBe(false));
  test("the pools list 10, 2, 5, 2 and 2", () =>
    expect(POOL_SIZES).toEqual({ conference: 10, subConference: 2, day: 5, timeBlock: 2, session: 2 }));
  test("a result says which pool it is listed in", () => {
    expect(MatchesSearchResponseSchema.safeParse({ matches: [pooled] }).success).toBe(true);
    for (const pool of [
      { type: "conference" },
      { type: "subConference", id: "Hydrology" },
      { type: "day", id: "2027-01-11" },
      { type: "timeBlock", id: "2027-01-11T08:30:00-06:00" },
    ]) {
      expect(MatchesSearchResponseSchema.safeParse({ matches: [{ ...searchMatch, pool }] }).success).toBe(true);
    }
  });
  test("the whole conference has no id, and every other pool has one", () => {
    const withId = { ...searchMatch, pool: { type: "conference", id: "x" } };
    expect(MatchesSearchResponseSchema.safeParse({ matches: [withId] }).success).toBe(false);
    const without = { ...searchMatch, pool: { type: "session" } };
    expect(MatchesSearchResponseSchema.safeParse({ matches: [without] }).success).toBe(false);
  });
  test("a day is a date and a time block a time with its offset", () => {
    for (const pool of [
      { type: "day", id: "2027-01-11T08:30:00-06:00" },
      { type: "timeBlock", id: "2027-01-11T08:30:00" },
    ]) {
      expect(MatchesSearchResponseSchema.safeParse({ matches: [{ ...searchMatch, pool }] }).success).toBe(false);
    }
  });
  test("a pooled result ranks within its pool's size", () => {
    expect(MatchesSearchResponseSchema.safeParse({ matches: [{ ...pooled, rank: 2 }] }).success).toBe(true);
    expect(issuePaths(MatchesSearchResponseSchema, { matches: [{ ...pooled, rank: 3 }] })).toContain("matches.0.rank");
  });
  test("a pooled result is a match", () =>
    expect(
      issuePaths(MatchesSearchResponseSchema, { matches: [{ ...pooled, match: false, shared: [] }] }),
    ).toContain("matches.0.pool"));
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
  "matches_search_request-pools-with-all.json": "include",
  "matches_search_request-pool-twice.json": "pools",
  "matches_search_response-pool-rank-beyond-size.json": "matches.0.rank",
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
