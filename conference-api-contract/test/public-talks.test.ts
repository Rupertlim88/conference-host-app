import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { z } from "zod";

import {
  ProblemSchema,
  TalkInputSchema,
  TalksWriteRequestSchema,
  TalksWriteResponseSchema,
} from "../src/public/index";

const FIXTURES = join(import.meta.dirname, "..", "fixtures", "public");
const read = (p: string) => JSON.parse(readFileSync(join(FIXTURES, p), "utf8"));

/** Every path and unrecognised key a failed parse names, as dotted strings. */
function issuePaths(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.flatMap((i) => [
    i.path.join("."),
    ...("keys" in i ? (i.keys as string[]).map((k) => [...i.path, k].join(".")) : []),
  ]);
}

const request = read("valid/talks_write_request.json");
const talk = request.talks[0];

describe("valid examples parse", () => {
  test("the full request", () => expect(TalksWriteRequestSchema.safeParse(request).success).toBe(true));
  test("the response", () =>
    expect(TalksWriteResponseSchema.safeParse(read("valid/talks_write_response.json")).success).toBe(true));
  test("the refusal", () => expect(ProblemSchema.safeParse(read("valid/problem.json")).success).toBe(true));
  test("a talk with only the required fields", () =>
    expect(TalkInputSchema.safeParse({ id: "1", title: "T", abstract: "A" }).success).toBe(true));
  test("a response with no matching job", () =>
    expect(
      TalksWriteResponseSchema.safeParse({ ...read("valid/talks_write_response.json"), matchingJob: null }).success,
    ).toBe(true));
});

describe("text is counted in characters and never blank", () => {
  test("counts characters, not UTF-16 units", () => {
    expect(TalkInputSchema.safeParse({ ...talk, abstract: "😀".repeat(10_000) }).success).toBe(true);
    expect(issuePaths(TalkInputSchema, { ...talk, abstract: "😀".repeat(10_001) })).toContain("abstract");
  });
  test("refuses whitespace-only title", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, title: "   " })).toContain("title"));
  test("refuses whitespace-only abstract", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, abstract: "\n\t " })).toContain("abstract"));
  test("refuses a title over 500 characters", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, title: "x".repeat(501) })).toContain("title"));
  test("refuses a blank author name", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, authors: [{ id: "A17", name: " " }], presenters: [] })).toContain(
      "authors.0.name",
    ));
});

describe("rules that link fields", () => {
  test("refuses a presenter who is not an author", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, presenters: ["A55"] })).toContain("presenters"));
  test("refuses an end before its start", () =>
    expect(
      issuePaths(TalkInputSchema, { ...talk, start: "2026-03-16T09:12:00-06:00", end: "2026-03-16T09:00:00-06:00" }),
    ).toContain("end"));
  test("compares start and end as instants, not as text", () =>
    expect(
      TalkInputSchema.safeParse({ ...talk, start: "2026-03-16T09:00:00-06:00", end: "2026-03-16T15:30:00Z" }).success,
    ).toBe(true));
  test("refuses a time without an offset from UTC", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, start: "2026-03-16T09:00:00" })).toContain("start"));
  test("refuses an ORCID iD with a bad check digit", () =>
    expect(
      issuePaths(TalkInputSchema, { ...talk, authors: [{ id: "A17", name: "Ana", orcid: "0000-0002-1825-0098" }] }),
    ).toContain("authors.0.orcid"));
  test("accepts an ORCID iD whose check digit is X", () =>
    expect(
      TalkInputSchema.safeParse({ ...talk, authors: [{ id: "A17", name: "Ana", orcid: "0000-0002-9079-593X" }] })
        .success,
    ).toBe(true));
  test("refuses the same author twice", () =>
    expect(
      issuePaths(TalkInputSchema, {
        ...talk,
        authors: [
          { id: "A17", name: "Ana" },
          { id: "A17", name: "Ana again" },
        ],
      }),
    ).toContain("authors"));
});

describe("choices and identifiers", () => {
  test("refuses a talk type outside the list", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, type: "workshop" })).toContain("type"));
  test("refuses a session type outside the list", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, session: { id: "G21", type: "keynote" } })).toContain(
      "session.type",
    ));
  test("refuses a partner id that could change a storage path", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, id: "../84213" })).toContain("id"));
  test("refuses more than 50 keywords", () =>
    expect(issuePaths(TalkInputSchema, { ...talk, keywords: Array.from({ length: 51 }, (_, i) => `k${i}`) })).toContain(
      "keywords",
    ));
});

describe("the request as a whole", () => {
  test("refuses unknown fields", () =>
    expect(issuePaths(TalksWriteRequestSchema, { talks: [talk], extra: 1 })).toContain("extra"));
  test("refuses 0 talks", () => expect(issuePaths(TalksWriteRequestSchema, { talks: [] })).toContain("talks"));
  test("accepts 1,000 talks and refuses 1,001", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, title: "T", abstract: "A" }));
    expect(TalksWriteRequestSchema.safeParse({ talks: many(1000) }).success).toBe(true);
    expect(issuePaths(TalksWriteRequestSchema, { talks: many(1001) })).toContain("talks");
  });
  test("refuses duplicate talk ids", () =>
    expect(issuePaths(TalksWriteRequestSchema, { talks: [talk, talk] })).toContain("talks"));
  test("refuses a talk both sent and withdrawn", () =>
    expect(issuePaths(TalksWriteRequestSchema, { talks: [talk], withdraw: [talk.id] })).toContain("withdraw"));
  test("refuses complete without sync", () =>
    expect(issuePaths(TalksWriteRequestSchema, { talks: [talk], complete: true })).toContain("complete"));
});

const EXPECTED_PATH: Record<string, string> = {
  "talks_write_request-abstract-too-long.json": "talks.0.abstract",
  "talks_write_request-blank-title.json": "talks.0.title",
  "talks_write_request-presenter-not-author.json": "talks.0.presenters",
  "talks_write_request-end-before-start.json": "talks.0.end",
  "talks_write_request-bad-orcid.json": "talks.0.authors.0.orcid",
  "talks_write_request-unknown-key.json": "extra",
  "talks_write_request-no-talks.json": "talks",
  "talks_write_request-sent-and-withdrawn.json": "withdraw",
  "talks_write_request-complete-without-sync.json": "complete",
  "talks_write_response-negative-count.json": "added",
  "problem-status-out-of-range.json": "status",
};
const SCHEMA_OF: Record<string, z.ZodType> = {
  talks_write_request: TalksWriteRequestSchema,
  talks_write_response: TalksWriteResponseSchema,
  problem: ProblemSchema,
};

describe("every invalid fixture fails at its stated path", () => {
  for (const [file, path] of Object.entries(EXPECTED_PATH)) {
    test(file, () => {
      const schema = SCHEMA_OF[file.split("-")[0]!]!;
      expect(issuePaths(schema, read(`invalid/${file}`))).toContain(path);
    });
  }
});

test("text that is too long says how long it may be, as the specification shows", () => {
  const result = TalksWriteRequestSchema.safeParse({ talks: [{ id: "T1", title: "A title", abstract: "x".repeat(10_001) }] });
  expect(result.error?.issues.map((i) => i.message)).toEqual(["longer than 10,000 characters"]);
});

describe("refusals and plain text", () => {
  const messages = (value: unknown) => (TalksWriteRequestSchema.safeParse(value).error?.issues ?? []).map((i) => i.message);
  const request = (title: string, abstract: string) => ({ talks: [{ id: "T1", title, abstract }] });

  test("a refusal never repeats an id that breaks the id format", () => {
    const bad = "<img src=x onerror=alert(1)>";
    const talk = { id: bad, title: "A title", abstract: "An abstract.", authors: [{ id: "A1", name: "Ana" }], presenters: ["x".repeat(600)] };
    const all = messages({ talks: [talk, talk], withdraw: [bad, bad] }).join(" | ");
    expect(all).toContain("is sent twice");
    expect(all).not.toContain("<img");
    expect(all).not.toContain("xxxxxxxx");
  });

  test("text holding a control character is refused, while tabs and new lines are kept", () => {
    for (const text of ["A\u001fB", "Next\u0085line", "﻿Marked", "Bell\u0007"]) {
      expect(TalksWriteRequestSchema.safeParse(request(text, "Fine.")).success, JSON.stringify(text)).toBe(false);
    }
    expect(TalksWriteRequestSchema.safeParse(request("Fine", "Line one\nline two\twith a tab\r\nand more.")).success).toBe(true);
  });
});
