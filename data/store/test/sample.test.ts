import { describe, expect, test } from "vitest";

import type { SocietyRows, TalkRow } from "../src/load";
import { SAMPLE_SIZE, sampleRows } from "../src/sample";

const at = (minute: number) => new Date(Date.UTC(2027, 0, 11, 16, minute));
const talk = (id: string, minute: number, over: Partial<TalkRow> = {}): TalkRow => ({
  id,
  sessionId: "s1",
  number: id,
  title: `Talk ${id}`,
  abstract: "An abstract.",
  kind: "oral",
  startsAt: at(minute),
  endsAt: at(minute + 15),
  room: "",
  building: "",
  booth: "",
  presentingAuthor: "",
  authorLine: "",
  affiliations: [],
  doi: "",
  citation: "",
  trackIds: ["A"],
  sort: minute,
  coreKeynote: false,
  newFellow: false,
  supplementary: false,
  ...over,
});

const rows = (talks: TalkRow[]): SocietyRows => ({
  meeting: { name: "M", startsOn: "2027-01-10", endsOn: "2027-01-14", timeZone: "America/Denver", venue: "V", city: "C", about: "" },
  tracks: [
    { id: "A", code: "A", title: "A", sort: 0, listed: true },
    { id: "L", code: "EXHIBITHALL", title: "Hall", sort: 1, listed: false },
  ],
  sessions: [],
  talks,
  people: talks.map((t) => ({ id: `p${t.id}`, name: `P ${t.id}`, affiliation: "" })),
  talkPeople: talks.map((t) => ({ talkId: t.id, personId: `p${t.id}` })),
  infoLists: [],
});

describe("sampleRows", () => {
  test("keeps the first five talks with an abstract in each track, in time order", () => {
    const all = [7, 1, 6, 2, 5, 3, 4].map((m) => talk(`t${m}`, m));
    expect(sampleRows(rows(all)).talks.map((t) => t.id).sort()).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    expect(SAMPLE_SIZE).toBe(5);
  });

  test("a talk counts for every track it is in, and a track still short of five keeps its next talk", () => {
    const all = [...[1, 2, 3, 4, 5].map((m) => talk(`a${m}`, m, { trackIds: ["A", "B"] })), talk("b6", 6, { trackIds: ["B"] }), talk("a7", 7)];
    expect(sampleRows(rows(all)).talks.map((t) => t.id)).toEqual(["a1", "a2", "a3", "a4", "a5"]);
  });

  test("keeps every break and every highlighted talk, and counts neither against the five", () => {
    const all = [
      ...[1, 2, 3, 4, 5, 6].map((m) => talk(`t${m}`, m)),
      talk("coffee", 0, { kind: "break", abstract: "" }),
      talk("keynote", 9, { coreKeynote: true }),
      talk("handout", 10, { supplementary: true }),
      talk("fellow", 11, { newFellow: true }),
    ];
    expect(sampleRows(rows(all)).talks.map((t) => t.id).sort()).toEqual(["coffee", "fellow", "handout", "keynote", "t1", "t2", "t3", "t4", "t5"]);
  });

  test("a talk with no abstract is not one of the five", () => {
    const all = [talk("blank", 0, { abstract: "" }), ...[1, 2, 3, 4, 5].map((m) => talk(`t${m}`, m))];
    expect(sampleRows(rows(all)).talks.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  test("keeps every track and session, and only the people of the talks it keeps", () => {
    const sampled = sampleRows(rows([1, 2, 3, 4, 5, 6].map((m) => talk(`t${m}`, m))));
    expect(sampled.tracks.map((t) => t.id)).toEqual(["A", "L"]);
    expect(sampled.people.map((p) => p.id)).toEqual(["pt1", "pt2", "pt3", "pt4", "pt5"]);
    expect(sampled.talkPeople.map((tp) => tp.talkId)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });
});
