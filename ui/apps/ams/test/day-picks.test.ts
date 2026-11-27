import type { AroundMatch } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import { picksOn } from "@/improvements/day-picks/day-picks";

import { aroundPools, talkSummary } from "./fixtures";

const match = (id: string, score: number): AroundMatch => ({
  talk: talkSummary({ id, sessionId: `S${id}` }),
  kind: "core",
  score,
  reason: `Why ${id} matches`,
  tracks: [],
});
const ids = (matches: AroundMatch[]) => matches.map((m) => m.talk.id);

describe("picksOn", () => {
  test("the talks the backend's pool for that day holds, in the matching API's order", () => {
    const pools = aroundPools({
      day: [
        { id: "2027-01-12", matches: [match("b", 0.9), match("d", 0.8), match("c", 0.7)] },
        { id: "2027-01-13", matches: [match("e", 0.99)] },
      ],
    });
    expect(ids(picksOn("2027-01-12", pools))).toEqual(["b", "d", "c"]);
  });

  test("never padded: a day whose pool holds fewer shows only those", () => {
    expect(ids(picksOn("2027-01-13", aroundPools({ day: [{ id: "2027-01-13", matches: [match("e", 0.99)] }] })))).toEqual(["e"]);
  });

  test("a day the matching API lists no pool for has no picks", () => {
    expect(picksOn("2027-01-14", aroundPools({ day: [{ id: "2027-01-13", matches: [match("e", 0.99)] }] }))).toEqual([]);
  });
});
