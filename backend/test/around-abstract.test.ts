import type { Restriction } from "@repo/contracts";
import type { TalkSummary } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import { groupPools, type Placing } from "../src/around-abstract";
import type { Match } from "../src/matching-api";

const summary = (id: string, sessionId: string | null): TalkSummary => ({
  id,
  sessionId,
  number: id,
  title: `Talk ${id}`,
  kind: "oral",
  startsAt: null,
  endsAt: null,
  room: "",
  building: "",
  booth: "",
  presentingAuthor: "",
  authorLine: "",
});
const match = (talk: string, restriction: Restriction): Match => ({ talk, restriction, kind: "core", score: 0.5, description: `Why ${talk}` });

// T1–T6 sit in session S1, which starts at 8:30 in Denver; T7 sits in S2, which starts at 10:30. P1 and P2 are
// conferences the list shows; P9 is the attendee's own, or a listing of organisations.
const placing: Placing = {
  talks: new Map(["T1", "T2", "T3", "T4", "T5", "T6"].map((id) => [id, summary(id, "S1")] as const).concat([["T7", summary("T7", "S2")]])),
  tracksOf: {},
  sessionStarts: new Map([
    ["S1", "2027-01-11T15:30:00.000Z"],
    ["S2", "2027-01-11T17:30:00.000Z"],
  ]),
  conferences: new Set(["P1", "P2"]),
};
const ids = (pool: { matches: { talk: { id: string } }[] } | undefined) => pool?.matches.map((m) => m.talk.id);

describe("the pools our improvements show around the fixed abstract", () => {
  test("each pool keeps the API's order and holds only as many matches as its box shows", () => {
    const day = { type: "day", id: "2027-01-11" } as const;
    const pools = groupPools(["T4", "T2", "T5", "T1"].map((t) => match(t, day)).concat(["T3", "T6"].map((t) => match(t, { type: "subConference", id: "P1" }))), placing);
    expect(ids(pools.day[0])).toEqual(["T4", "T2", "T5"]);
    expect(ids(pools.subConference[0])).toEqual(["T3"]);
  });

  test("a conference pool is kept only for a conference the list shows other than the attendee's own", () => {
    const pools = groupPools(
      [match("T1", { type: "subConference", id: "P9" }), match("T2", { type: "subConference", id: "P2" })],
      placing,
    );
    expect(pools.subConference.map((p) => p.id)).toEqual(["P2"]);
  });

  test("a time block holds only talks whose session starts with it, at the same instant whatever the offset", () => {
    const block = { type: "timeBlock", id: "2027-01-11T08:30:00-07:00" } as const;
    const pools = groupPools([match("T7", block), match("T1", block), match("T2", block), match("T3", block)], placing);
    expect(pools.timeBlock).toEqual([{ id: "2027-01-11T15:30:00.000Z", matches: [expect.objectContaining({ talk: summary("T1", "S1") }), expect.anything()] }]);
    expect(ids(pools.timeBlock[0])).toEqual(["T1", "T2"]);
  });

  test("a session holds only its own talks", () => {
    const pools = groupPools([match("T7", { type: "session", id: "S1" }), match("T2", { type: "session", id: "S1" })], placing);
    expect(ids(pools.session[0])).toEqual(["T2"]);
  });

  test("a match to a talk the programme does not show, or under a restriction it cannot name, is left out, and no pool is empty", () => {
    const pools = groupPools(
      [
        match("T99", { type: "day", id: "2027-01-12" }),
        match("T1", { type: "conference" }),
        match("T1", { type: "talks" }),
        match("T1", { type: "session", id: "not an id!" }),
        match("T7", { type: "session", id: "S1" }),
      ],
      placing,
    );
    expect(pools).toEqual({ subConference: [], day: [], timeBlock: [], session: [] });
  });
});
