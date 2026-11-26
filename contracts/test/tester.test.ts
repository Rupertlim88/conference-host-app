import { describe, expect, test } from "vitest";

import { ProgrammeMapSchema, RecommendationsSchema, TestSetReplySchema, TestSetSchema } from "../src/index";

describe("the programme map", () => {
  const map = {
    conference: "ams-2027",
    timeBlocks: [{ start: "2027-01-11T08:30", sessions: ["75841", "75842"] }],
    sessions: [
      { id: "75841", start: "2027-01-11T08:30", talks: ["498388"] },
      { id: "76000", start: null, talks: ["498390"] },
    ],
    conferences: [{ trackId: "1959", title: "29th Conference on Atmospheric Chemistry", talks: ["498388", "498390"] }],
  };

  test("takes the agreed form, with a session that has no start", () => {
    expect(ProgrammeMapSchema.parse(map)).toEqual(map);
  });

  test("times are the meeting's clock to the minute, without seconds or offset", () => {
    const withOffset = { ...map, timeBlocks: [{ start: "2027-01-11T08:30:00-07:00", sessions: ["75841"] }] };
    expect(ProgrammeMapSchema.safeParse(withOffset).success).toBe(false);
  });

  test("ids are AMS's ids as strings, not numbers", () => {
    const numeric = { ...map, sessions: [{ id: 75841, start: "2027-01-11T08:30", talks: ["498388"] }] };
    expect(ProgrammeMapSchema.safeParse(numeric).success).toBe(false);
  });
});

describe("a test set", () => {
  const testSet = { conference: "ams-2027", askers: ["498388"], talks: ["498388", "484295"] };

  test("takes the agreed form", () => {
    expect(TestSetSchema.parse(testSet)).toEqual(testSet);
  });

  test("is refused with an empty list", () => {
    expect(TestSetSchema.safeParse({ ...testSet, askers: [] }).success).toBe(false);
    expect(TestSetSchema.safeParse({ ...testSet, talks: [] }).success).toBe(false);
  });

  test("is refused when it lists a talk twice", () => {
    expect(TestSetSchema.safeParse({ ...testSet, talks: ["498388", "498388"] }).success).toBe(false);
    expect(TestSetSchema.safeParse({ ...testSet, askers: ["498388", "498388"] }).success).toBe(false);
  });

  test("is refused with anything it does not name", () => {
    expect(TestSetSchema.safeParse({ ...testSet, cases: ["484295"] }).success).toBe(false);
    expect(TestSetSchema.safeParse({ ...testSet, talks: [498388] }).success).toBe(false);
  });

  test("its answer gives the programme version the send returned", () => {
    expect(TestSetReplySchema.parse({ sentProgrammeVersion: "pv_1" })).toEqual({ sentProgrammeVersion: "pv_1" });
    expect(TestSetReplySchema.safeParse({}).success).toBe(false);
  });
});

describe("the report on an abstract tested", () => {
  const verdict = {
    basedOn: "498388",
    talk: "484295",
    kind: "core",
    rank: 1,
    score: 0.5,
    match: true,
    shared: ["technique"],
    description: "Both retrieve smoke heights from satellites.",
    methods: [],
    programmeVersion: "pv_1",
  };
  const report = {
    abstract: "498388",
    sentProgrammeVersion: "pv_1",
    matchesProgrammeVersion: null,
    places: [
      { layout: "time_block", key: "2027-01-11T08:30", pool: ["484295", "484296"], shown: ["484295"], verdicts: [verdict], notJudged: ["484296"] },
    ],
  };

  test("passes on each verdict exactly as the matching API gave it", () => {
    expect(RecommendationsSchema.parse(report)).toEqual(report);
  });

  test("names each place by one of its six layouts", () => {
    for (const layout of ["related", "conference_outside", "conference_inside", "day", "time_block", "session"]) {
      expect(RecommendationsSchema.safeParse({ ...report, places: [{ ...report.places[0], layout }] }).success).toBe(true);
    }
    expect(RecommendationsSchema.safeParse({ ...report, places: [{ ...report.places[0], layout: "week" }] }).success).toBe(false);
  });
});
