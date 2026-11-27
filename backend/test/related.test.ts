import type { Restriction } from "@repo/contracts";
import type { TalkSummary } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import type { ConferenceApi, Match, RestrictedAnswer } from "../src/matching-api";
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
  restricted: async (talkId, restrictions, top) => (asked.push([talkId, restrictions, top]), answer),
  verdicts: async () => ({ status: "unavailable" }),
  writeTalks: async () => {
    throw new Error("not used");
  },
  check: async () => {
    throw new Error("not used");
  },
});
const m = (talk: string, kind: "core" | "unexpected", restriction: Restriction = { type: "conference" }): Match => ({
  talk,
  kind,
  restriction,
  score: 0.8,
  description: `Why ${talk} is relevant to this study.`,
});

describe("relatedTalks", () => {
  test("asks the matching API for six matches around the talk in the whole conference, one more than the panel shows", async () => {
    asked.length = 0;
    await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: [], judging: [] }), "T1");
    expect(asked).toEqual([["T1", ["conference"], 6]]);
  });

  test("joins each match to its talk, in the API's order, skipping talks this programme lacks", async () => {
    const api = apiAnswering({ status: "ok", matches: [m("T3", "unexpected"), m("T9", "core"), m("T2", "core")], judging: [] });
    expect(await relatedTalks({ talkSummaries }, api, "T1")).toEqual({
      status: "matches",
      matches: [
        { talk: summary("T3"), kind: "unexpected", score: 0.8, reason: "Why T3 is relevant to this study." },
        { talk: summary("T2"), kind: "core", score: 0.8, reason: "Why T2 is relevant to this study." },
      ],
    });
  });

  test("shows the first five of the matches the whole conference lists", async () => {
    const ten = ["T2", "T9", "T3", "T4", "T5", "T6", "T7", "T8", "T10", "T11"].map((id) => m(id, "core"));
    const got = await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: ten, judging: [] }), "T1");
    expect(got.status === "matches" && got.matches.map((x) => x.talk.id)).toEqual(["T2", "T3", "T4", "T5", "T6"]);
  });

  test("shows only what the matching API listed under the whole conference", async () => {
    const api = apiAnswering({ status: "ok", matches: [m("T2", "core", { type: "session", id: "S1" }), m("T3", "core")], judging: [] });
    const got = await relatedTalks({ talkSummaries }, api, "T1");
    expect(got.status === "matches" && got.matches.map((x) => x.talk.id)).toEqual(["T3"]);
  });

  test("no usable matches is none", async () => {
    expect(await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: [m("T9", "core")], judging: [] }), "T1")).toEqual(
      { status: "none" },
    );
  });

  test("while the matching API is still judging the talk, its related talks are still being matched", async () => {
    const api = apiAnswering({ status: "ok", matches: [], judging: [{ basedOn: "T1", restriction: { type: "conference" } }] });
    expect(await relatedTalks({ talkSummaries }, api, "T1")).toEqual({ status: "judging" });
  });

  test("an unavailable API stays unavailable", async () => {
    expect(await relatedTalks({ talkSummaries }, apiAnswering({ status: "unavailable" }), "T1")).toEqual({
      status: "unavailable",
    });
  });
});
