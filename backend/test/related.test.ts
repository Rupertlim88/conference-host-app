import type { Restriction } from "@repo/contracts";
import type { TalkSummary } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import type { ConferenceApi, RestrictedAnswer } from "../src/matching-api";
import { relatedTalks } from "../src/related";

const summary = (id: string): TalkSummary => ({
  id,
  sessionId: null,
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
const known = new Set(["T2", "T3", "T4", "T5", "T6", "T7", "T8"]);
const talkSummaries = async (ids: string[]) => ids.filter((id) => known.has(id)).map(summary);
const asked: unknown[] = [];
const apiAnswering = (answer: RestrictedAnswer): ConferenceApi => ({
  restricted: async (talkId, restrictions) => (asked.push([talkId, restrictions]), answer),
  verdicts: async () => ({ status: "unavailable" }),
  writeTalks: async () => {
    throw new Error("not used");
  },
  check: async () => {
    throw new Error("not used");
  },
});
const m = (talk: string, kind: "core" | "unexpected", rank = 1, restriction: Restriction = { type: "conference" }) => ({
  basedOn: "T1",
  talk,
  match: true,
  shared: ["technique" as const],
  kind,
  rank,
  restriction,
  score: 0.8,
  description: `Why ${talk} is relevant to this study.`,
  methods: [],
  programmeVersion: "pv_8f3k2Qw9xLm0ZpT4vN7aBc",
});

describe("relatedTalks", () => {
  test("asks the matching API for its matches around the talk in the whole conference", async () => {
    asked.length = 0;
    await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: [], judging: [] }), "T1");
    expect(asked).toEqual([["T1", ["conference"]]]);
  });

  test("joins each match to its talk, in the API's order, skipping talks this programme lacks", async () => {
    const api = apiAnswering({ status: "ok", matches: [m("T3", "unexpected", 1), m("T9", "core", 2), m("T2", "core", 3)], judging: [] });
    expect(await relatedTalks({ talkSummaries }, api, "T1")).toEqual({
      status: "matches",
      matches: [
        { talk: summary("T3"), kind: "unexpected", score: 0.8, reason: "Why T3 is relevant to this study." },
        { talk: summary("T2"), kind: "core", score: 0.8, reason: "Why T2 is relevant to this study." },
      ],
    });
  });

  test("shows the first five of the matches the whole conference lists", async () => {
    const ten = ["T2", "T9", "T3", "T4", "T5", "T6", "T7", "T8", "T10", "T11"].map((id, i) => m(id, "core", i + 1));
    const got = await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: ten, judging: [] }), "T1");
    expect(got.status === "matches" && got.matches.map((x) => x.talk.id)).toEqual(["T2", "T3", "T4", "T5", "T6"]);
  });

  test("shows only what the matching API listed under the whole conference", async () => {
    const api = apiAnswering({ status: "ok", matches: [m("T2", "core", 1, { type: "session", id: "S1" }), m("T3", "core", 1)], judging: [] });
    const got = await relatedTalks({ talkSummaries }, api, "T1");
    expect(got.status === "matches" && got.matches.map((x) => x.talk.id)).toEqual(["T3"]);
  });

  test("no usable matches is none", async () => {
    expect(await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: [m("T9", "core")], judging: [] }), "T1")).toEqual(
      { status: "none" },
    );
  });

  test("while the whole conference is still being judged, there are none yet", async () => {
    const api = apiAnswering({ status: "ok", matches: [], judging: [{ basedOn: "T1", restriction: { type: "conference" } }] });
    expect(await relatedTalks({ talkSummaries }, api, "T1")).toEqual({ status: "none" });
  });

  test("an unavailable API stays unavailable", async () => {
    expect(await relatedTalks({ talkSummaries }, apiAnswering({ status: "unavailable" }), "T1")).toEqual({
      status: "unavailable",
    });
  });
});
