import type { AroundMatch, AroundPool } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import { calendarBlocks } from "@/improvements/time-block-picks/time-block-picks";

import { sessionSummary, talkSummary } from "./fixtures";

// Tuesday, January 12, 2027. B and C start together but end at different times, so AMS shows them under two headings.
const at = (time: string) => `2027-01-12T${time}:00.000Z`;
const D = sessionSummary({ id: "D", startsAt: at("14:00"), endsAt: at("15:30") });
const A = sessionSummary({ id: "A", startsAt: at("15:30"), endsAt: at("17:00") });
const B = sessionSummary({ id: "B", startsAt: at("15:30"), endsAt: at("17:00") });
const C = sessionSummary({ id: "C", startsAt: at("15:30"), endsAt: at("18:00") });
const E = sessionSummary({ id: "E", startsAt: at("17:00"), endsAt: at("17:45") });
const day = [D, A, B, C, E];

const match = (talkId: string, sessionId: string | null, over: Partial<AroundMatch> = {}): AroundMatch => ({
  talk: talkSummary({ id: talkId, sessionId, startsAt: at("15:45") }),
  kind: "core",
  score: 0.5,
  reason: `Why ${talkId} matches`,
  tracks: [],
  ...over,
});
/** The matching API's pool for the time block that starts at 8:30 AM in Denver, listing these matches in its order. */
const halfPastEight = (...matches: AroundMatch[]): AroundPool[] => [{ id: at("15:30"), matches }];

const picksAt = (pools: AroundPool[], startsAt: string) =>
  calendarBlocks(day, pools)
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

  test("a block recommends the sessions of the talks the matching API lists in its pool for that block, in the API's order", () => {
    expect(picksAt(halfPastEight(match("c1", "C"), match("b1", "B")), at("15:30"))).toEqual(["C", "B"]);
  });

  test("at most two sessions are recommended", () => {
    expect(picksAt(halfPastEight(match("a1", "A"), match("b1", "B"), match("c1", "C")), at("15:30"))).toEqual(["A", "B"]);
  });

  test("the block's pool is the one that starts at the same instant, however its time is written", () => {
    expect(picksAt([{ id: "2027-01-12T15:30:00Z", matches: [match("b1", "B")] }], at("15:30"))).toEqual(["B"]);
  });

  test("only the block the matching API lists a pool for has recommendations, never padded with others", () => {
    expect(picksAt(halfPastEight(match("b1", "B")), at("15:30"))).toEqual(["B"]);
    expect(picksAt(halfPastEight(match("b1", "B")), at("14:00"))).toEqual([]);
  });

  test("a recommendation carries its match's kind and reason, and when its related talk starts", () => {
    const listed = match("b1", "B", { kind: "unexpected", talk: talkSummary({ id: "b1", sessionId: "B", startsAt: at("15:35") }) });
    const [pick] = calendarBlocks(day, halfPastEight(listed)).find((b) => b.startsAt === at("15:30"))!.picks;
    expect(pick).toEqual({ session: B, kind: "unexpected", reason: "Why b1 matches", talkAt: at("15:35") });
  });

  test("the rest of the block follows in AMS's order without the picks, and a heading left empty goes", () => {
    const block = calendarBlocks(day, halfPastEight(match("b1", "B"), match("c1", "C"))).find((b) => b.startsAt === at("15:30"))!;
    expect(block.groups).toEqual([{ startsAt: at("15:30"), endsAt: at("17:00"), sessions: [A] }]);
  });

  test("a block with no recommendation has no picks, and keeps AMS's groups as they are", () => {
    const blocks = calendarBlocks(day, halfPastEight(match("b1", "B")));
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

  test("a listed talk in a session outside the block, or in no session, is left out", () => {
    const blocks = calendarBlocks(day, halfPastEight(match("x1", "77102"), match("x2", null), match("e1", "E")));
    expect(blocks.flatMap((b) => b.picks)).toEqual([]);
  });

  test("untimed sessions are left out, as AMS leaves them out", () => {
    const untimed = sessionSummary({ id: "U", startsAt: null, endsAt: null });
    expect(calendarBlocks([untimed], halfPastEight(match("u1", "U")))).toEqual([]);
  });
});
