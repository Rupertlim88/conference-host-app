import type { Pool } from "@repo/contracts";
import type { TalkSummary } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import type { ConferenceApi, PooledAnswer } from "../src/matching-api";
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
const apiAnswering = (answer: PooledAnswer): ConferenceApi => ({
  pooled: async (talkId, pools) => (asked.push([talkId, pools]), answer),
  verdicts: async () => ({ status: "unavailable" }),
  writeTalks: async () => {
    throw new Error("not used");
  },
  check: async () => {
    throw new Error("not used");
  },
});
const m = (talk: string, kind: "core" | "unexpected", rank = 1, pool: Pool = { type: "conference" }) => ({
  basedOn: "T1",
  talk,
  match: true,
  shared: ["technique" as const],
  kind,
  rank,
  pool,
  score: 0.8,
  description: `Why ${talk} is relevant to this study.`,
  methods: [],
  programmeVersion: "pv_8f3k2Qw9xLm0ZpT4vN7aBc",
});

describe("relatedTalks", () => {
  test("asks the matching API for the whole conference's pool around the talk", async () => {
    asked.length = 0;
    await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: [] }), "T1");
    expect(asked).toEqual([["T1", ["conference"]]]);
  });

  test("joins each match to its talk, in the API's order, skipping talks this programme lacks", async () => {
    const api = apiAnswering({ status: "ok", matches: [m("T3", "unexpected", 1), m("T9", "core", 2), m("T2", "core", 3)] });
    expect(await relatedTalks({ talkSummaries }, api, "T1")).toEqual({
      status: "matches",
      matches: [
        { talk: summary("T3"), kind: "unexpected", score: 0.8, reason: "Why T3 is relevant to this study." },
        { talk: summary("T2"), kind: "core", score: 0.8, reason: "Why T2 is relevant to this study." },
      ],
    });
  });

  test("shows the first five of the up to ten the pool lists", async () => {
    const ten = ["T2", "T9", "T3", "T4", "T5", "T6", "T7", "T8", "T10", "T11"].map((id, i) => m(id, "core", i + 1));
    const got = await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: ten }), "T1");
    expect(got.status === "matches" && got.matches.map((x) => x.talk.id)).toEqual(["T2", "T3", "T4", "T5", "T6"]);
  });

  test("shows only what the matching API listed in the whole conference's pool", async () => {
    const api = apiAnswering({ status: "ok", matches: [m("T2", "core", 1, { type: "session", id: "S1" }), m("T3", "core", 1)] });
    const got = await relatedTalks({ talkSummaries }, api, "T1");
    expect(got.status === "matches" && got.matches.map((x) => x.talk.id)).toEqual(["T3"]);
  });

  test("no usable matches is none", async () => {
    expect(await relatedTalks({ talkSummaries }, apiAnswering({ status: "ok", matches: [m("T9", "core")] }), "T1")).toEqual(
      { status: "none" },
    );
  });

  test("an unavailable API stays unavailable", async () => {
    expect(await relatedTalks({ talkSummaries }, apiAnswering({ status: "unavailable" }), "T1")).toEqual({
      status: "unavailable",
    });
  });
});
