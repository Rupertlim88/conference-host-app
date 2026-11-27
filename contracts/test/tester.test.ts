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

  describe("with a layout of where our versions place the talks", () => {
    const layout = {
      timeBlocks: [{ start: "2027-01-11T08:30", sessions: ["75841", "75842"] }],
      sessions: [
        { id: "75841", start: "2027-01-11T08:30", talks: ["498388"] },
        { id: "75842", start: "2027-01-11T08:30", talks: ["484295"] },
      ],
      conferences: [{ trackId: "1959", title: "29th Conference on Atmospheric Chemistry", talks: ["498388", "484295"] }],
    };
    const laidOut = { ...testSet, talks: ["498388", "484295", "490001"], layout };
    const refused = (change: object) => TestSetSchema.safeParse({ ...laidOut, layout: { ...layout, ...change } });
    const reason = (change: object) => refused(change).error?.issues.map((i) => i.message).join("; ");

    test("takes the programme map's shapes, all three together, and a talk placed nowhere", () => {
      expect(TestSetSchema.parse(laidOut)).toEqual(laidOut);
      expect(TestSetSchema.safeParse({ ...laidOut, layout: { sessions: layout.sessions } }).success).toBe(false);
    });

    test("is refused when it places a talk the test set does not hold, or a talk in two sessions", () => {
      expect(reason({ sessions: [layout.sessions[0], { id: "75842", start: "2027-01-11T08:30", talks: ["999"] }] })).toBe(
        "places talks the test set does not hold: 999",
      );
      expect(reason({ conferences: [{ trackId: "1959", title: "", talks: ["999"] }] })).toBe("places talks the test set does not hold: 999");
      expect(reason({ sessions: [layout.sessions[0], { id: "75842", start: "2027-01-11T08:30", talks: ["498388"] }] })).toBe(
        "places a talk in two sessions: 498388",
      );
    });

    test("is refused when it lists a session or a conference twice", () => {
      expect(reason({ sessions: [layout.sessions[0], layout.sessions[0]] })).toContain("lists a session twice: 75841");
      expect(reason({ conferences: [layout.conferences[0], layout.conferences[0]] })).toBe("lists a conference twice: 1959");
    });

    test("is refused when its time blocks and sessions disagree", () => {
      expect(reason({ timeBlocks: [{ start: "2027-01-11T08:30", sessions: ["75841", "75842", "77777"] }] })).toBe(
        "a time block names a session the layout does not list: 77777",
      );
      expect(reason({ timeBlocks: [{ start: "2027-01-11T10:30", sessions: ["75841", "75842"] }] })).toBe(
        "a time block names a session that starts at another time: 75841, 75842",
      );
      expect(reason({ timeBlocks: [{ start: "2027-01-11T08:30", sessions: ["75841"] }] })).toBe("a session is in no time block: 75842");
      expect(
        reason({
          timeBlocks: [
            { start: "2027-01-11T08:30", sessions: ["75841", "75842"] },
            { start: "2027-01-11T08:30", sessions: ["75842"] },
          ],
        }),
      ).toBe("a session is in two time blocks: 75842");
      expect(refused({ sessions: [{ id: "75841", start: null, talks: [] }] }).success).toBe(false);
    });
  });

  test("its answer gives the programme version the send returned", () => {
    expect(TestSetReplySchema.parse({ sentProgrammeVersion: "pv_1" })).toEqual({ sentProgrammeVersion: "pv_1" });
    expect(TestSetReplySchema.safeParse({}).success).toBe(false);
  });
});

describe("the report on an abstract tested", () => {
  // One connection, in the conference API's form, passed on as the API gave it.
  const verdict = {
    talks: ["498388", "484295"],
    titles: ["Emerging Satellite Constraints on Fire Combustion", "Smoke heights from satellites"],
    restriction: { type: "talks" },
    rank: 1,
    score: 0.5,
    kind: "core",
    shared: ["technique"],
    descriptions: ["Both retrieve smoke heights from satellites.", "Both retrieve smoke heights from satellites."],
    methods: [],
    programmeVersion: "pv_BNjggT1ZSKHfDg9SImJWFA",
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

  test("each verdict is a connection in the conference API's form, and nothing else", () => {
    const withVerdict = (v: object) => RecommendationsSchema.safeParse({ ...report, places: [{ ...report.places[0], verdicts: [v] }] }).success;
    expect(withVerdict({ basedOn: "498388", talk: "484295", kind: "core" })).toBe(false);
    expect(withVerdict({ ...verdict, talks: ["498388"] })).toBe(false);
    expect(withVerdict({ ...verdict, extra: true })).toBe(false);
  });

  test("names each place by one of its six layouts", () => {
    for (const layout of ["related", "conference_outside", "conference_inside", "day", "time_block", "session"]) {
      expect(RecommendationsSchema.safeParse({ ...report, places: [{ ...report.places[0], layout }] }).success).toBe(true);
    }
    expect(RecommendationsSchema.safeParse({ ...report, places: [{ ...report.places[0], layout: "week" }] }).success).toBe(false);
  });
});
