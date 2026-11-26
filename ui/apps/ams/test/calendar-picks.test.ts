import type { RelatedMatch } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import { calendarBlocks } from "@/improvements/calendar-picks";

import { sessionSummary, talkSummary } from "./fixtures";

// Tuesday, January 12, 2027. B and C start together but end at different times, so AMS shows them under two headings.
const at = (time: string) => `2027-01-12T${time}:00.000Z`;
const D = sessionSummary({ id: "D", startsAt: at("14:00"), endsAt: at("15:30") });
const A = sessionSummary({ id: "A", startsAt: at("15:30"), endsAt: at("17:00") });
const B = sessionSummary({ id: "B", startsAt: at("15:30"), endsAt: at("17:00") });
const C = sessionSummary({ id: "C", startsAt: at("15:30"), endsAt: at("18:00") });
const E = sessionSummary({ id: "E", startsAt: at("17:00"), endsAt: at("17:45") });
const day = [D, A, B, C, E];

const match = (talkId: string, sessionId: string | null, score: number, over: Partial<RelatedMatch> = {}): RelatedMatch => ({
  talk: talkSummary({ id: talkId, sessionId, startsAt: at("15:45") }),
  kind: "core",
  score,
  reason: `Why ${talkId} matches`,
  ...over,
});

const picksAt = (matches: RelatedMatch[], startsAt: string) =>
  calendarBlocks(day, matches)
    .find((b) => b.startsAt === startsAt)!
    .picks.map((p) => p.session.id);

describe("calendarBlocks", () => {
  test("a time block is every session that starts at the same time, earliest first", () => {
    expect(calendarBlocks(day, []).map((b) => [b.startsAt, b.groups.flatMap((g) => g.sessions.map((s) => s.id))])).toEqual([
      [at("14:00"), ["D"]],
      [at("15:30"), ["A", "B", "C"]],
      [at("17:00"), ["E"]],
    ]);
  });

  test("the session with more related talks comes first, then the one with the better score", () => {
    const matches = [match("c1", "C", 0.9), match("b1", "B", 0.6), match("b2", "B", 0.5)];
    expect(picksAt(matches, at("15:30"))).toEqual(["B", "C"]);
    expect(picksAt([match("a1", "A", 0.7), match("c1", "C", 0.9)], at("15:30"))).toEqual(["C", "A"]);
  });

  test("at most two sessions are picked, each once however many of its talks match", () => {
    const matches = [match("a1", "A", 0.95), match("b1", "B", 0.6), match("b2", "B", 0.5), match("c1", "C", 0.9)];
    expect(picksAt(matches, at("15:30"))).toEqual(["B", "A"]);
  });

  test("sessions with equal counts and scores keep AMS's order", () => {
    expect(picksAt([match("c1", "C", 0.8), match("a1", "A", 0.8)], at("15:30"))).toEqual(["A", "C"]);
  });

  test("only sessions that hold a match are picked, never padded with others", () => {
    expect(picksAt([match("b1", "B", 0.4)], at("15:30"))).toEqual(["B"]);
    expect(picksAt([match("b1", "B", 0.4)], at("14:00"))).toEqual([]);
  });

  test("a pick says how many related talks it holds, its best match's kind and reason, and when its first related talk is", () => {
    const early = match("b1", "B", 0.5, { kind: "unexpected", talk: talkSummary({ id: "b1", sessionId: "B", startsAt: at("15:35") }) });
    const best = match("b2", "B", 0.8, { talk: talkSummary({ id: "b2", sessionId: "B", startsAt: at("16:00") }) });
    const [pick] = calendarBlocks(day, [best, early]).find((b) => b.startsAt === at("15:30"))!.picks;
    expect(pick).toEqual({ session: B, related: 2, kind: "core", reason: "Why b2 matches", score: 0.8, firstTalkAt: at("15:35") });
  });

  test("the rest of the block follows in AMS's order without the picks, and a heading left empty goes", () => {
    const block = calendarBlocks(day, [match("b1", "B", 0.6), match("c1", "C", 0.9)]).find((b) => b.startsAt === at("15:30"))!;
    expect(block.groups).toEqual([{ startsAt: at("15:30"), endsAt: at("17:00"), sessions: [A] }]);
  });

  test("a block with no recommendation stays exactly as AMS has it", () => {
    const blocks = calendarBlocks(day, [match("b1", "B", 0.6)]);
    expect(blocks.find((b) => b.startsAt === at("14:00"))).toEqual({
      startsAt: at("14:00"),
      picks: [],
      groups: [{ startsAt: at("14:00"), endsAt: at("15:30"), sessions: [D] }],
    });
    expect(calendarBlocks(day, []).find((b) => b.startsAt === at("15:30"))!.groups).toEqual([
      { startsAt: at("15:30"), endsAt: at("17:00"), sessions: [A, B] },
      { startsAt: at("15:30"), endsAt: at("18:00"), sessions: [C] },
    ]);
  });

  test("matches in a session that is not on this day, or in no session, are left out", () => {
    const blocks = calendarBlocks(day, [match("x1", "77102", 0.9), match("x2", null, 0.9)]);
    expect(blocks.flatMap((b) => b.picks)).toEqual([]);
  });

  test("untimed sessions are left out, as AMS leaves them out", () => {
    const untimed = sessionSummary({ id: "U", startsAt: null, endsAt: null });
    expect(calendarBlocks([untimed], [match("u1", "U", 0.9)])).toEqual([]);
  });
});
