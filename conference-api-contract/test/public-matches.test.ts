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

const searchEntry = read("valid/matches_search_response.json").abstracts[0];
const connection = searchEntry.connections[0];
const textMatch = read("valid/matches_from_text_response.json").matches[0];
const answering = (change: object, entry: object = {}) => ({
  abstracts: [{ ...searchEntry, ...entry, connections: [{ ...connection, ...change }] }],
});
const AT = "abstracts.0.connections.0";
const without = (value: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(value).filter(([k]) => k !== key));

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
  test("a last page has no next token", () =>
    expect(MatchesSearchResponseSchema.safeParse({ abstracts: [searchEntry] }).success).toBe(true));
});

describe("matches:search", () => {
  const liking = (extra: object) => ({ likeTalks: ["T42"], ...extra });
  test("refuses people and likeTalks together", () =>
    expect(issuePaths(MatchesSearchRequestSchema, { people: ["P1"], likeTalks: ["T42"] })).toContain("likeTalks"));
  test("names the people or the liked talks it matches, never everyone", () => {
    expect(issuePaths(MatchesSearchRequestSchema, {})).toContain("people");
    expect(issuePaths(MatchesSearchRequestSchema, { restrictions: [{ type: "day" }] })).toContain("people");
  });
  test("pageSize is 1 to 1,000 and defaults to 100", () => {
    expect(MatchesSearchRequestSchema.parse(liking({})).pageSize).toBe(100);
    expect(issuePaths(MatchesSearchRequestSchema, liking({ pageSize: 0 }))).toContain("pageSize");
    expect(issuePaths(MatchesSearchRequestSchema, liking({ pageSize: 1001 }))).toContain("pageSize");
    expect(MatchesSearchRequestSchema.safeParse(liking({ pageSize: 1000 })).success).toBe(true);
  });
  test("asks for 1 to 1,000 matches per main talk and restriction, or leaves it out for every match found", () => {
    expect(MatchesSearchRequestSchema.safeParse(liking({ top: 5 })).success).toBe(true);
    expect(issuePaths(MatchesSearchRequestSchema, liking({ top: 0 }))).toContain("top");
    expect(issuePaths(MatchesSearchRequestSchema, liking({ top: 1001 }))).toContain("top");
  });
  test("no longer takes include or topPerPerson: only matches are listed, as many as top asks for", () => {
    expect(issuePaths(MatchesSearchRequestSchema, liking({ include: "all" }))).toContain("include");
    expect(issuePaths(MatchesSearchRequestSchema, liking({ topPerPerson: 3 }))).toContain("topPerPerson");
  });
  test("minScore is 0 to 1", () => {
    expect(issuePaths(MatchesSearchRequestSchema, liking({ minScore: -0.01 }))).toContain("minScore");
    expect(issuePaths(MatchesSearchRequestSchema, liking({ minScore: 1.01 }))).toContain("minScore");
  });
  test("refuses a kind outside core and unexpected", () =>
    expect(issuePaths(MatchesSearchRequestSchema, liking({ kind: "both" }))).toContain("kind"));
  test("refuses more than 100 liked talks", () =>
    expect(
      issuePaths(MatchesSearchRequestSchema, { likeTalks: Array.from({ length: 101 }, (_, i) => `T${i}`) }),
    ).toContain("likeTalks"));
  test("refuses a page token that is not one of ours", () =>
    expect(issuePaths(MatchesSearchRequestSchema, liking({ pageToken: "abc" }))).toContain("pageToken"));
});

describe("matches:search answer", () => {
  test("has one entry per main talk, with its title and its connections", () => {
    expect(issuePaths(MatchesSearchResponseSchema, { abstracts: [without(searchEntry, "title")] })).toContain(
      "abstracts.0.title",
    );
    expect(issuePaths(MatchesSearchResponseSchema, { abstracts: [{ ...searchEntry, connections: [] }] })).toContain(
      "abstracts.0.connections",
    );
  });
  test("a connection names both talks with their titles, the main talk first", () => {
    expect(issuePaths(MatchesSearchResponseSchema, answering({ talks: ["T42", "T17"] }))).toContain(`${AT}.talks`);
    expect(issuePaths(MatchesSearchResponseSchema, answering({ talks: ["T17", "T17"] }))).toContain(`${AT}.talks`);
    expect(issuePaths(MatchesSearchResponseSchema, answering({ titles: [connection.titles[0]] }))).toContain(`${AT}.titles`);
  });
  test("a connection carries two descriptions, one from each talk's side, each 1 to 800 characters", () => {
    expect(issuePaths(MatchesSearchResponseSchema, answering({ descriptions: [connection.descriptions[0]] }))).toContain(
      `${AT}.descriptions`,
    );
    expect(
      issuePaths(MatchesSearchResponseSchema, answering({ descriptions: [connection.descriptions[0], "x".repeat(801)] })),
    ).toContain(`${AT}.descriptions.1`);
    expect(issuePaths(MatchesSearchResponseSchema, answering({ descriptions: [" ", connection.descriptions[1]] }))).toContain(
      `${AT}.descriptions.0`,
    );
  });
  test("a connection is a real match: it shares the intent, the technique or both, in that order", () => {
    expect(MatchesSearchResponseSchema.safeParse(answering({ shared: ["intent", "technique"] })).success).toBe(true);
    for (const shared of [[], ["technique", "intent"], ["intent", "intent"], ["method"]]) {
      expect(issuePaths(MatchesSearchResponseSchema, answering({ shared })).join(" "), String(shared)).toContain(`${AT}.shared`);
    }
    expect(issuePaths(MatchesSearchResponseSchema, answering({ match: false }))).toContain(`${AT}.match`);
  });
  test("each linked method gives the intent and the technique of both talks, in the order of talks, at most 20", () => {
    const pair = connection.methods[0];
    expect(issuePaths(MatchesSearchResponseSchema, answering({ methods: [[pair[0]]] }))).toContain(`${AT}.methods.0`);
    expect(
      issuePaths(MatchesSearchResponseSchema, answering({ methods: [[pair[0], { ...pair[1], intent: "x".repeat(2001) }]] })),
    ).toContain(`${AT}.methods.0.1.intent`);
    expect(
      issuePaths(MatchesSearchResponseSchema, answering({ methods: Array.from({ length: 21 }, () => pair) })),
    ).toContain(`${AT}.methods`);
  });
  test("refuses a score above 1", () =>
    expect(issuePaths(MatchesSearchResponseSchema, answering({ score: 1.5 }))).toContain(`${AT}.score`));
  test("a connection says which restriction it is listed under", () => {
    for (const restriction of [
      { type: "conference" },
      { type: "subConference", id: "Hydrology" },
      { type: "day", id: "2027-01-11" },
      { type: "timeBlock", id: "2027-01-11T08:30:00-06:00" },
      { type: "session", id: "G21" },
      { type: "talks" },
    ]) {
      expect(MatchesSearchResponseSchema.safeParse(answering({ restriction })).success).toBe(true);
    }
    const unplaced = without(connection, "restriction");
    expect(issuePaths(MatchesSearchResponseSchema, { abstracts: [{ ...searchEntry, connections: [unplaced] }] })).toContain(
      `${AT}.restriction`,
    );
  });
  test("a page holds at most 1,000 connections", () => {
    const entry = { ...searchEntry, connections: Array.from({ length: 501 }, () => connection) };
    expect(issuePaths(MatchesSearchResponseSchema, { abstracts: [entry, entry] })).toContain("abstracts");
  });
});

describe("matches:fromText", () => {
  test("refuses whitespace-only text", () =>
    expect(issuePaths(MatchesFromTextRequestSchema, { text: " \n " })).toContain("text"));
  test("refuses a missing text", () => expect(issuePaths(MatchesFromTextRequestSchema, {})).toContain("text"));
  test("not enough information needs a reason", () =>
    expect(
      issuePaths(MatchesFromTextResponseSchema, { judging: false, enoughInformation: false, whatIsMissing: null, matches: [] }),
    ).toContain("whatIsMissing"));
  test("not enough information means no matches", () =>
    expect(
      issuePaths(MatchesFromTextResponseSchema, {
        judging: false,
        enoughInformation: false,
        whatIsMissing: "a clear research method",
        matches: [textMatch],
      }),
    ).toContain("matches"));
  test("enough information means nothing is missing", () =>
    expect(
      issuePaths(MatchesFromTextResponseSchema, { judging: false, enoughInformation: true, whatIsMissing: "x", matches: [] }),
    ).toContain("whatIsMissing"));
  test("a text still being judged says so, and nothing else", () => {
    expect(MatchesFromTextResponseSchema.safeParse({ judging: true }).success).toBe(true);
    expect(issuePaths(MatchesFromTextResponseSchema, { judging: true, enoughInformation: true })).toContain("enoughInformation");
  });
  test("an answer says it is no longer being judged", () =>
    expect(issuePaths(MatchesFromTextResponseSchema, { enoughInformation: true, whatIsMissing: null, matches: [] })).toContain(
      "judging",
    ));
  test("a fromText match keeps its reason and shared methods", () =>
    expect(Object.keys(textMatch)).toEqual(expect.arrayContaining(["reason", "sharedMethods"])));
  test("a fromText match never names a person", () =>
    expect(
      MatchesFromTextResponseSchema.safeParse({
        judging: false,
        enoughInformation: true,
        whatIsMissing: null,
        matches: [{ ...textMatch, person: "P1" }],
      }).success,
    ).toBe(false));
});

describe("matches:search with restrictions", () => {
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
  test("an answer lists the restrictions still being judged, for each talk they restrict", () => {
    const judging = [{ basedOn: "T42", restriction: { type: "timeBlock", id: "2027-01-11T08:30:00-06:00" } }];
    expect(MatchesSearchResponseSchema.safeParse({ abstracts: [], judging }).success).toBe(true);
    expect(MatchesSearchResponseSchema.safeParse({ abstracts: [], judging: [{ restriction: { type: "day" } }] }).success).toBe(
      false,
    );
  });
});

const EXPECTED_PATH: Record<string, string> = {
  "matches_search_request-people-and-like-talks.json": "likeTalks",
  "matches_search_request-page-size-zero.json": "pageSize",
  "matches_search_response-score-above-one.json": "abstracts.0.connections.0.score",
  "matches_search_response-description-too-long.json": "abstracts.0.connections.0.descriptions.1",
  "matches_search_response-nothing-shared.json": "abstracts.0.connections.0.shared",
  "matches_search_request-top-zero.json": "top",
  "matches_from_text_request-blank-text.json": "text",
  "matches_from_text_response-not-enough-with-matches.json": "matches",
  "matches_from_text_response-judging-with-matches.json": "matches",
  "matches_search_request-restriction-twice.json": "restrictions",
  "matches_search_request-for-everyone.json": "people",
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
