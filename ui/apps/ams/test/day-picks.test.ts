import type { AroundMatch } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import { picksOn } from "@/improvements/day-picks/day-picks";

import { talkSummary } from "./fixtures";

const match = (id: string, sessionId: string | null, startsAt: string | null, score: number): AroundMatch => ({
  talk: talkSummary({ id, sessionId, startsAt }),
  kind: "core",
  score,
  reason: `Why ${id} matches`,
  tracks: [],
});
const ids = (matches: AroundMatch[]) => matches.map((m) => m.talk.id);

describe("picksOn", () => {
  test("up to three talks that start that day in meeting time, the better score first", () => {
    const matches = [
      match("a", "S1", "2027-01-12T15:30:00.000Z", 0.5),
      match("b", "S2", "2027-01-12T16:45:00.000Z", 0.9),
      match("c", "S3", "2027-01-12T21:00:00.000Z", 0.7),
      // 10:00 PM on Tuesday in Denver, though Wednesday in UTC.
      match("d", "S4", "2027-01-13T05:00:00.000Z", 0.8),
      // 7:00 AM on Wednesday in Denver.
      match("e", "S5", "2027-01-13T14:00:00.000Z", 0.99),
    ];
    expect(ids(picksOn("2027-01-12", matches))).toEqual(["b", "d", "c"]);
  });

  test("one talk from each session, and never padded with others", () => {
    const matches = [
      match("a", "S1", "2027-01-12T15:30:00.000Z", 0.9),
      match("b", "S1", "2027-01-12T15:45:00.000Z", 0.85),
      match("c", "S2", "2027-01-12T21:00:00.000Z", 0.3),
    ];
    expect(ids(picksOn("2027-01-12", matches))).toEqual(["a", "c"]);
  });

  test("talks with no time, or on other days, are never picked", () => {
    expect(picksOn("2027-01-12", [match("a", "S1", null, 0.9), match("b", "S2", "2027-01-11T16:00:00.000Z", 0.9)])).toEqual([]);
  });
});
