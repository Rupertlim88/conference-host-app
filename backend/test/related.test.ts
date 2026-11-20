import type { TalkSummary } from "@repo/host-contracts";
import { describe, expect, test } from "vitest";

import type { ConferenceApi, RelatedAnswer } from "../src/conference-api";
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
const known = new Set(["T2", "T3"]);
const talkSummaries = async (ids: string[]) => ids.filter((id) => known.has(id)).map(summary);
const apiAnswering = (answer: RelatedAnswer): ConferenceApi => ({
  related: async () => answer,
  writeTalks: async () => {
    throw new Error("not used");
  },
  check: async () => {
    throw new Error("not used");
  },
});
const m = (talk: string, kind: "core" | "unexpected") => ({
  talk,
  kind,
  rank: 1,
  score: 0.8,
  reason: "Shared method.",
  sharedMethods: [],
  programmeVersion: "pv_8f3k2Qw9xLm0ZpT4vN7aBc",
});

describe("relatedTalks", () => {
  test("joins each match to its talk, in the API's order, skipping talks this programme lacks", async () => {
    const api = apiAnswering({ status: "ok", matches: [m("T3", "unexpected"), m("T9", "core"), m("T2", "core")] });
    expect(await relatedTalks({ talkSummaries }, api, "T1")).toEqual({
      status: "matches",
      matches: [
        { talk: summary("T3"), kind: "unexpected", score: 0.8, reason: "Shared method." },
        { talk: summary("T2"), kind: "core", score: 0.8, reason: "Shared method." },
      ],
    });
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
