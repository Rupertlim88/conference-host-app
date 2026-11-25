import { describe, expect, test } from "vitest";

import {
  DateInputSchema,
  IdInputSchema,
  NoteInputSchema,
  RelatedTalksSchema,
  SearchInputSchema,
  TalkDetailSchema, SocietySchema } from "../src/index";

const summary = {
  id: "464598",
  sessionId: "73193",
  number: "J7.1",
  title: "Into the Storm",
  kind: "oral",
  startsAt: "2026-01-27T19:45:00.000Z",
  endsAt: null,
  room: "350D",
  building: "George R. Brown Convention Center",
  booth: "",
  presentingAuthor: "William J Graff",
  authorLine: "William J Graff, US Air Force, WPAFB, OH",
};

describe("ids and inputs", () => {
  test("an id is short and plain", () => {
    expect(IdInputSchema.safeParse({ id: "464598" }).success).toBe(true);
    expect(IdInputSchema.safeParse({ id: "" }).success).toBe(false);
    expect(IdInputSchema.safeParse({ id: "../x" }).success).toBe(false);
    expect(IdInputSchema.safeParse({ id: "a".repeat(65) }).success).toBe(false);
  });
  test("a date is a real calendar date", () => {
    expect(DateInputSchema.safeParse({ date: "2026-01-27" }).success).toBe(true);
    expect(DateInputSchema.safeParse({ date: "2026-13-01" }).success).toBe(false);
  });
  test("search text is 2 to 100 characters, trimmed", () => {
    expect(SearchInputSchema.parse({ q: "  storm " }).q).toBe("storm");
    expect(SearchInputSchema.safeParse({ q: "a" }).success).toBe(false);
    expect(SearchInputSchema.safeParse({ q: "a".repeat(101) }).success).toBe(false);
  });
  test("a note is at most 5,000 characters", () => {
    const target = { targetKind: "talk", targetId: "1" };
    expect(NoteInputSchema.safeParse({ ...target, body: "ok" }).success).toBe(true);
    expect(NoteInputSchema.safeParse({ ...target, body: "a".repeat(5001) }).success).toBe(false);
  });
});

describe("talk detail", () => {
  test("carries the summary fields plus abstract and session", () => {
    const detail = { ...summary, abstract: "Text.", affiliations: [], doi: "", citation: "", trackIds: [], session: null };
    expect(TalkDetailSchema.safeParse(detail).success).toBe(true);
    expect(TalkDetailSchema.safeParse({ ...detail, kind: "lecture" }).success).toBe(false);
  });
});

describe("related talks", () => {
  test("is matches, none, or unavailable", () => {
    expect(RelatedTalksSchema.safeParse({ status: "none" }).success).toBe(true);
    expect(RelatedTalksSchema.safeParse({ status: "unavailable" }).success).toBe(true);
    const match = { talk: summary, kind: "unexpected", score: 0.9, reason: "Shared method." };
    expect(RelatedTalksSchema.safeParse({ status: "matches", matches: [match] }).success).toBe(true);
    expect(RelatedTalksSchema.safeParse({ status: "matches", matches: [] }).success).toBe(false);
  });
});

describe("societies", () => {
  test("the host app carries AMS only", () => {
    expect(SocietySchema.options).toEqual(["ams"]);
    expect(SocietySchema.safeParse("gsa").success).toBe(false);
  });
});
