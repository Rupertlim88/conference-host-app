import type { WholeProgramme, WholeTalk } from "@repo/host-store";
import { describe, expect, test } from "vitest";

import { answerProgrammeMap, programmeMap } from "../src/programme-map";

const talk = (id: string, sessionId: string | null, trackIds: string[], over: Partial<WholeTalk> = {}): WholeTalk => ({
  id,
  sessionId,
  kind: "oral",
  hasAbstract: true,
  trackIds,
  sort: 0,
  ...over,
});

// Sessions S1 and S2 start together on Monday at 8:30, S7 at 8:30 on Tuesday, S3 alone at 10:30; S4 has no start.
// S2 is a joint session of both conferences, though its talks name only Hydrology. S5 holds only a break, and S6
// nothing. T6 is in no session.
const contents: WholeProgramme = {
  tracks: [
    { id: "1959", title: "Atmospheric Chemistry" },
    { id: "1960", title: "Hydrology" },
    { id: "1961", title: "A conference with no talks" },
  ],
  sessions: [
    { id: "S3", start: "2027-01-11T10:30:00-07:00", trackIds: ["1960"] },
    { id: "S2", start: "2027-01-11T08:30:00-07:00", trackIds: ["1959", "1960"] },
    { id: "S1", start: "2027-01-11T08:30:00-07:00", trackIds: ["1959"] },
    { id: "S4", start: null, trackIds: ["1960"] },
    { id: "S5", start: "2027-01-11T08:30:00-07:00", trackIds: ["1959"] },
    { id: "S6", start: "2027-01-11T08:30:00-07:00", trackIds: ["1961"] },
    { id: "S7", start: "2027-01-12T08:30:00-07:00", trackIds: ["1959"] },
  ],
  talks: [
    talk("T1", "S1", ["1959"]),
    talk("T2", "S2", ["1960"], { sort: 1 }),
    talk("T3", "S2", ["1960"], { sort: 0 }),
    talk("T4", "S3", ["1960"], { kind: "poster" }),
    talk("T5", "S4", ["1960"]),
    talk("B1", "S5", ["1959"], { kind: "break", hasAbstract: false }),
    talk("T6", null, ["1959"]),
    talk("T7", "S7", ["1959"]),
  ],
};

describe("the programme map", () => {
  const map = programmeMap(contents, "ams-2027");

  test("a time block is every session starting at the same minute that day, and a lone session is its own block", () => {
    expect(map.timeBlocks).toEqual([
      { start: "2027-01-11T08:30", sessions: ["S1", "S2"] },
      { start: "2027-01-11T10:30", sessions: ["S3"] },
      { start: "2027-01-12T08:30", sessions: ["S7"] },
    ]);
  });

  test("every session lists its talks in their order, talks only, and a session with no start is in no block", () => {
    expect(map.sessions).toEqual([
      { id: "S1", start: "2027-01-11T08:30", talks: ["T1"] },
      { id: "S2", start: "2027-01-11T08:30", talks: ["T3", "T2"] },
      { id: "S3", start: "2027-01-11T10:30", talks: ["T4"] },
      { id: "S7", start: "2027-01-12T08:30", talks: ["T7"] },
      { id: "S4", start: null, talks: ["T5"] },
    ]);
  });

  test("every conference lists its own talks, a joint session's talk only under its own conferences, as the report places it", () => {
    expect(map.conferences).toEqual([
      { trackId: "1959", title: "Atmospheric Chemistry", talks: ["T1", "T7", "T6"] },
      { trackId: "1960", title: "Hydrology", talks: ["T3", "T2", "T4", "T5"] },
    ]);
  });

  test("names the conference it maps", () => {
    expect(map.conference).toBe("ams-2027");
  });
});

describe("the answer to a request for the map", () => {
  test("is the map, in its fixed form", async () => {
    const res = await answerProgrammeMap({ contents: async () => contents }, "ams-2027");
    expect(res.status).toBe(200);
    expect((await res.json()).timeBlocks[0]).toEqual({ start: "2027-01-11T08:30", sessions: ["S1", "S2"] });
  });

  test("is 503, with a plain message, before the whole programme is loaded", async () => {
    const res = await answerProgrammeMap({ contents: async () => ({ talks: [], sessions: [], tracks: [] }) }, "ams-2027");
    expect(res.status).toBe(503);
    expect(await res.text()).toMatch(/not loaded/);
  });
});
