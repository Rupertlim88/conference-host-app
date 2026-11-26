import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { z } from "zod";

import {
  ApiKeySchema,
  CompleteMatchingJobSchema,
  CorpusSchema,
  EngineTalkSchema,
  INTERNAL_SCHEMAS,
  SearchMatchesOutcomeSchema,
  SearchMatchesQuerySchema,
  TextMatchJobSchema,
  TextMatchResultSchema,
  TextRequestCommandSchema,
  WriteTalksOutcomeSchema,
  emitInternal,
} from "../src/internal/index";

const ROOT = join(import.meta.dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const valid = (kind: string) => read(`fixtures/internal/valid/${kind}.json`);

function issuePaths(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("every internal kind has a valid example that parses", () => {
  for (const [kind, schema] of Object.entries(INTERNAL_SCHEMAS)) {
    test(kind, () => expect(schema.safeParse(valid(kind)).success).toBe(true));
  }
});

describe("API keys", () => {
  test("a key is the fixed prefix, then 32 random bytes in base64url; anything else is not a key", () => {
    const key = `cmapi_${"A1b2-_".repeat(7)}x`;
    expect(ApiKeySchema.safeParse(key).success).toBe(true);
    for (const notAKey of [key.slice(0, -1), `${key}x`, key.replace("cmapi_", "cmapx_"), key.replace("cmapi_", ""), `${key.slice(0, -1)}=`]) {
      expect(ApiKeySchema.safeParse(notAKey).success, notAKey).toBe(false);
    }
  });
});

describe("internal rules", () => {
  test("internal talk ids start at 1", () =>
    expect(issuePaths(EngineTalkSchema, { ...valid("engine_talk"), id: 0 })).toContain("id"));
  test("an engine reads a talk's session and when it starts, or null when the talk was sent without them", () => {
    const talk = valid("engine_talk");
    expect(talk.session).toEqual({ id: "G21", start: "2027-01-11T08:30:00-06:00" });
    expect(EngineTalkSchema.safeParse({ ...talk, session: null }).success).toBe(true);
    expect(EngineTalkSchema.safeParse({ ...talk, session: { id: "G21", start: null } }).success).toBe(true);
    expect(issuePaths(EngineTalkSchema, { ...talk, session: { id: "G21", start: "2027-01-11" } })).toContain(
      "session.start",
    );
    expect(issuePaths(EngineTalkSchema, { ...talk, session: { id: "G21", start: null, title: "x" } })).toContain(
      "session",
    );
  });
  test("a corpus talk names its presenters, who are among its authors", () => {
    const talk = valid("engine_talk");
    expect(talk.presenterIds.length).toBeGreaterThan(0);
    expect(issuePaths(EngineTalkSchema, { ...talk, presenterIds: [999_999] })).toContain("presenterIds");
  });
  test("each match carries the kinds of edge that join its talks, each named once, or none", () => {
    const job = valid("complete_matching_job");
    expect(job.matches[0].pools).toEqual([{ type: "conference" }, { type: "session", id: "G21" }]);
    job.matches[0].pools = [];
    expect(CompleteMatchingJobSchema.safeParse(job).success).toBe(true);
    job.matches[0].pools = [{ type: "session", id: "G21" }, { type: "session", id: "G21" }];
    expect(issuePaths(CompleteMatchingJobSchema, job)).toContain("matches.0.pools");
    job.matches[0].pools = [{ type: "room", id: "B1" }];
    expect(CompleteMatchingJobSchema.safeParse(job).success).toBe(false);
    delete job.matches[0].pools;
    expect(CompleteMatchingJobSchema.safeParse(job).success).toBe(false);
  });
  test("an engine score stays between 0 and 1", () => {
    const job = valid("complete_matching_job");
    job.matches[0].score = 1.5;
    expect(issuePaths(CompleteMatchingJobSchema, job)).toContain("matches.0.score");
  });
  test("an engine id is lower case letters, digits and underscores", () => {
    const job = valid("complete_matching_job");
    job.run.engineId = "Graph-V1";
    expect(issuePaths(CompleteMatchingJobSchema, job)).toContain("run.engineId");
  });
  test("a run records the engine's version and the models it used", () => {
    const job = valid("complete_matching_job");
    delete job.run.engineVersion;
    delete job.run.models;
    expect(issuePaths(CompleteMatchingJobSchema, job)).toEqual(expect.arrayContaining(["run.engineVersion", "run.models"]));
  });
  test("a job's pair is a match exactly when the two share something", () => {
    const job = valid("complete_matching_job");
    job.matches[0].shared = [];
    expect(issuePaths(CompleteMatchingJobSchema, job)).toContain("matches.0.match");
  });
  test("a job keeps the talks found not to match, with their descriptions", () => {
    const job = valid("complete_matching_job");
    expect(job.matches.some((m: { match: boolean }) => !m.match)).toBe(true);
    expect(CompleteMatchingJobSchema.safeParse(job).success).toBe(true);
  });
  test("a text result keeps its reason and shared methods", () => {
    const result = valid("text_match_result");
    expect(Object.keys(result.matches[0])).toEqual(expect.arrayContaining(["reason", "sharedMethods"]));
    expect(TextMatchResultSchema.safeParse(result).success).toBe(true);
  });
  test("a talk is never matched with itself", () => {
    const job = valid("complete_matching_job");
    job.matches[0].candidate = job.matches[0].anchor;
    expect(issuePaths(CompleteMatchingJobSchema, job)).toContain("matches.0.candidate");
  });
  test("a job's matches name each pair of talks once", () => {
    const job = valid("complete_matching_job");
    job.matches[1] = { ...job.matches[0] };
    expect(issuePaths(CompleteMatchingJobSchema, job)).toContain("matches.1");
  });
  test("a text result names each talk once", () => {
    const result = valid("text_match_result");
    result.matches.push({ ...result.matches[0] });
    expect(issuePaths(TextMatchResultSchema, result)).toContain("matches.1");
  });
  test("a search and a text request name the engine whose matches they serve", () => {
    const search = valid("search_matches_query");
    const text = valid("text_request_command");
    delete search.engine;
    delete text.engine;
    expect(issuePaths(SearchMatchesQuerySchema, search)).toContain("engine");
    expect(issuePaths(TextRequestCommandSchema, text)).toContain("engine");
  });
  test("a search and a text request name the partner that asked and the organiser it acted for", () => {
    for (const [schema, fixtureName] of [[SearchMatchesQuerySchema, "search_matches_query"], [TextRequestCommandSchema, "text_request_command"]] as const) {
      const command = valid(fixtureName);
      expect(command.actor).toEqual({ partner: "org-aps", organiser: "org-aps" });
      delete command.actor;
      expect(issuePaths(schema, command)).toContain("actor");
    }
  });
  test("a refused write lists its problems and carries no result", () => {
    expect(
      WriteTalksOutcomeSchema.safeParse({ ok: false, errors: [{ talk: "84001", field: "withdraw", problem: "no such talk" }] })
        .success,
    ).toBe(true);
    expect(WriteTalksOutcomeSchema.safeParse({ ok: false, errors: [] }).success).toBe(false);
  });
  test("a stale page token is its own outcome", () =>
    expect(SearchMatchesOutcomeSchema.safeParse({ ok: false, problem: "page-token-invalid" }).success).toBe(true));
  test("a text request can come before the conference has any programme", () => {
    expect(TextMatchJobSchema.safeParse({ ...valid("text_match_job"), programmeVersion: null }).success).toBe(true);
    expect(CorpusSchema.safeParse({ programmeVersion: null, talks: [] }).success).toBe(true);
    expect(
      TextMatchResultSchema.safeParse({
        ...valid("text_match_result"),
        programmeVersion: null,
        enoughInformation: false,
        whatIsMissing: "a clear research method",
        matches: [],
      }).success,
    ).toBe(true);
  });
  test("a text result without enough information has no matches", () =>
    expect(
      issuePaths(TextMatchResultSchema, {
        ...valid("text_match_result"),
        enoughInformation: false,
        whatIsMissing: "a clear research method",
      }),
    ).toContain("matches"));
});

describe("committed internal JSON Schema matches the zod source", () => {
  for (const [kind, schema] of Object.entries(emitInternal())) {
    test(kind, () => expect(read(`schema/internal/${kind}.schema.json`)).toEqual(schema));
  }
});

test("every committed internal schema file has a source and vice versa", () =>
  expect(readdirSync(join(ROOT, "schema", "internal")).sort()).toEqual(
    Object.keys(emitInternal())
      .map((k) => `${k}.schema.json`)
      .sort(),
  ));

test("a write names the partner that sends it and the organiser it acts for", () => {
  const command = valid("write_talks_command");
  expect(command.actor).toEqual({ partner: "app-events", organiser: "org-aps" });
  const withoutActor: Record<string, unknown> = { ...command };
  delete withoutActor.actor;
  expect(INTERNAL_SCHEMAS.write_talks_command.safeParse(withoutActor).success).toBe(false);
});
