import type { Person, SessionSummary } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import { timeBlocks } from "../lib/blocks";
import { byLetter, surnameOf } from "../lib/people";
import { cardLabel, toneOf } from "../lib/tones";

const session = (id: string, startsAt: string | null, endsAt: string | null, number = id): SessionSummary => ({
  id,
  number,
  title: `Session ${id}`,
  kind: "Session",
  format: "",
  startsAt,
  endsAt,
  room: "",
  building: "",
  trackIds: [],
});

describe("timeBlocks", () => {
  test("groups sessions that share a start and end, in time order", () => {
    const blocks = timeBlocks([
      session("b", "2027-01-12T15:30:00.000Z", "2027-01-12T17:00:00.000Z"),
      session("a", "2027-01-12T14:00:00.000Z", "2027-01-12T15:30:00.000Z"),
      session("c", "2027-01-12T15:30:00.000Z", "2027-01-12T17:00:00.000Z"),
    ]);
    expect(blocks.map((b) => [b.startsAt, b.sessions.map((s) => s.id)])).toEqual([
      ["2027-01-12T14:00:00.000Z", ["a"]],
      ["2027-01-12T15:30:00.000Z", ["b", "c"]],
    ]);
  });
  test("leaves out sessions with no start", () => {
    expect(timeBlocks([session("x", null, null)])).toEqual([]);
  });
});

describe("toneOf", () => {
  test("names a tone for each kind of session", () => {
    expect(toneOf("Event")).toBe("event");
    expect(toneOf("Town Hall Meeting")).toBe("event");
    expect(toneOf("Poster Session")).toBe("poster");
    expect(toneOf("Joint Session")).toBe("joint");
    expect(toneOf("Panel Discussion")).toBe("panel");
    expect(toneOf("Break")).toBe("break");
    expect(toneOf("Session")).toBe("oral");
    expect(toneOf("")).toBe("oral");
  });
});

describe("people", () => {
  const p = (name: string): Person => ({ id: name.toLowerCase().replace(/\W+/g, "-"), name, affiliation: "" });
  test("the surname is the last word", () => {
    expect(surnameOf("Andrew A. Rosenow")).toBe("Rosenow");
    expect(surnameOf("Jonathan D. W. Kahl")).toBe("Kahl");
  });
  test("groups by the surname's first letter, A to Z, sorted by surname", () => {
    const groups = byLetter([p("Zoe Adams"), p("Ann Brown"), p("Al Abbott"), p("Ünal Özkan"), p("Team 42")]);
    expect(groups.map((g) => g.letter)).toEqual(["A", "B", "O", "#"]);
    expect(groups[0]!.people.map((x) => x.name)).toEqual(["Al Abbott", "Zoe Adams"]);
  });
});

describe("cardLabel", () => {
  test("shows the kind, then the number when there is one", () => {
    expect(cardLabel("Event", "")).toBe("Event");
    expect(cardLabel("Panel Discussion", "9")).toBe("Panel Discussion 9");
    expect(cardLabel("Joint Session", "J1")).toBe("Joint Session J1");
  });
  test("plain sessions show their number; breaks show nothing", () => {
    expect(cardLabel("Session", "5")).toBe("5");
    expect(cardLabel("", "")).toBe("");
    expect(cardLabel("Break", "")).toBe("");
  });
});
