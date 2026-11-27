import { describe, expect, test } from "vitest";

import {
  DateInputSchema,
  IdInputSchema,
  NoteInputSchema,
  RelatedTalksSchema,
  SearchInputSchema,
  TalkDetailSchema, SavedNoteSchema, SocietySchema, CodeInputSchema, HighlightInputSchema, NamePageInputSchema, AroundAbstractSchema, FixedAbstractInputSchema } from "../src/index";

const summary = {
  id: "464598",
  sessionId: "73193",
  number: "J7.1",
  title: "Into the Storm",
  kind: "oral",
  startsAt: "2026-01-27T19:45:00.000Z",
  endsAt: null,
  room: "350D",
  building: "George R. Brown Convention Center",
  booth: "",
  presentingAuthor: "William J Graff",
  authorLine: "William J Graff, US Air Force, WPAFB, OH",
};

describe("ids and inputs", () => {
  test("an id is short and plain", () => {
    expect(IdInputSchema.safeParse({ id: "464598" }).success).toBe(true);
    expect(IdInputSchema.safeParse({ id: "" }).success).toBe(false);
    expect(IdInputSchema.safeParse({ id: "../x" }).success).toBe(false);
    expect(IdInputSchema.safeParse({ id: "a".repeat(65) }).success).toBe(false);
  });
  test("a date is a real calendar date", () => {
    expect(DateInputSchema.safeParse({ date: "2026-01-27" }).success).toBe(true);
    expect(DateInputSchema.safeParse({ date: "2026-13-01" }).success).toBe(false);
  });
  test("search text is 2 to 100 characters, trimmed", () => {
    expect(SearchInputSchema.parse({ q: "  storm " }).q).toBe("storm");
    expect(SearchInputSchema.safeParse({ q: "a" }).success).toBe(false);
    expect(SearchInputSchema.safeParse({ q: "a".repeat(101) }).success).toBe(false);
  });
  test("a note is at most 5,000 characters", () => {
    const target = { targetKind: "talk", targetId: "1" };
    expect(NoteInputSchema.safeParse({ ...target, body: "ok" }).success).toBe(true);
    expect(NoteInputSchema.safeParse({ ...target, body: "a".repeat(5001) }).success).toBe(false);
  });
});

describe("talk detail", () => {
  test("carries the summary fields plus abstract and session", () => {
    const detail = { ...summary, abstract: "Text.", affiliations: [], doi: "", citation: "", trackIds: [], session: null };
    expect(TalkDetailSchema.safeParse(detail).success).toBe(true);
    expect(TalkDetailSchema.safeParse({ ...detail, kind: "lecture" }).success).toBe(false);
  });
});

describe("related talks", () => {
  test("is matches, none, still being matched, or unavailable", () => {
    expect(RelatedTalksSchema.safeParse({ status: "none" }).success).toBe(true);
    expect(RelatedTalksSchema.safeParse({ status: "judging" }).success).toBe(true);
    expect(RelatedTalksSchema.safeParse({ status: "unavailable" }).success).toBe(true);
    const match = { talk: summary, kind: "unexpected", score: 0.9, reason: "Shared method." };
    expect(RelatedTalksSchema.safeParse({ status: "matches", matches: [match] }).success).toBe(true);
    expect(RelatedTalksSchema.safeParse({ status: "matches", matches: [] }).success).toBe(false);
  });
});

describe("societies", () => {
  test("the host app carries AMS only", () => {
    expect(SocietySchema.options).toEqual(["ams"]);
    expect(SocietySchema.safeParse("gsa").success).toBe(false);
  });
});

describe("a guest's saved note", () => {
  test("is its body and when it was saved, or nothing", () => {
    expect(SavedNoteSchema.parse({ body: "Ask about it.", updatedAt: "2027-01-11T15:00:00.000Z" })?.body).toBe("Ask about it.");
    expect(SavedNoteSchema.parse(null)).toBeNull();
    expect(SavedNoteSchema.safeParse({ body: "x" }).success).toBe(false);
  });
});

describe("a session kind asked for", () => {
  test("is 1 to 100 characters after trimming, and holds no NUL character", () => {
  });
});

const noPools = { subConference: [], day: [], timeBlock: [], session: [] };

describe("the demo's menu, highlights, pages of names and fixed abstract", () => {
  test("only AMS's menu programmes, highlight lists and pages of names can be asked for", () => {
    expect(CodeInputSchema.safeParse({ code: "EXHIBITHALL" }).success).toBe(true);
    expect(CodeInputSchema.safeParse({ code: "TRASH" }).success).toBe(false);
    expect(HighlightInputSchema.safeParse({ list: "keynotes" }).success).toBe(true);
    expect(HighlightInputSchema.safeParse({ list: "everything" }).success).toBe(false);
    expect(NamePageInputSchema.safeParse({ page: "officers" }).success).toBe(true);
    expect(NamePageInputSchema.safeParse({ page: "press" }).success).toBe(false);
  });

  test("the view around the abstract names the conferences it sits in; its pools are null when the API cannot answer, and its layout without one", () => {
    expect(AroundAbstractSchema.safeParse({ abstract: null, abstractTrackIds: [], pools: null, layout: null }).success).toBe(true);
    expect(AroundAbstractSchema.safeParse({ abstract: summary, abstractTrackIds: ["1878", "1912"], pools: noPools, layout: null }).success).toBe(true);
    expect(AroundAbstractSchema.safeParse({ abstract: summary, abstractTrackIds: ["../x"], pools: noPools, layout: null }).success).toBe(false);
    expect(AroundAbstractSchema.safeParse({ abstract: summary, pools: noPools, layout: null }).success).toBe(false);
    expect(AroundAbstractSchema.safeParse({ abstract: summary, abstractTrackIds: [], pools: noPools }).success).toBe(false);
  });

  test("with a test set's layout, the view carries each laid-out session with its talks", () => {
    const session = { id: "S1", number: "5", title: "Storms", kind: "Session", format: "", startsAt: null, endsAt: null, room: "", building: "", trackIds: [] };
    const layout = [{ session, talks: [summary] }];
    expect(AroundAbstractSchema.safeParse({ abstract: summary, abstractTrackIds: [], pools: noPools, layout }).success).toBe(true);
    expect(AroundAbstractSchema.safeParse({ abstract: summary, abstractTrackIds: [], pools: noPools, layout: [{ session }] }).success).toBe(false);
  });

  describe("the matching API's pools around the abstract", () => {
    const talk = { id: "T2", sessionId: "S1", number: "5.2", title: "T", kind: "oral", startsAt: null, endsAt: null, room: "", building: "", booth: "", presentingAuthor: "", authorLine: "" };
    const match = { talk, kind: "unexpected", score: 0.8, reason: "Same technique.", tracks: [{ id: "P1", code: "EDU", title: "Education" }] };
    const around = (pools: object) => AroundAbstractSchema.safeParse({ abstract: null, abstractTrackIds: [], pools: { ...noPools, ...pools }, layout: null });

    test("each other conference, day, time block and session is a pool of matches, each with its talk, kind, score, reason and conferences", () => {
      expect(
        around({
          subConference: [{ id: "P1", matches: [match] }],
          day: [{ id: "2027-01-12", matches: [match] }],
          timeBlock: [{ id: "2027-01-12T15:30:00.000Z", matches: [match] }],
          session: [{ id: "S1", matches: [match, match] }],
        }).success,
      ).toBe(true);
      expect(around({ session: [{ id: "S1", matches: [{ ...match, tracks: undefined }] }] }).success).toBe(false);
    });

    test("a pool holds at least one match", () => {
      expect(around({ session: [{ id: "S1", matches: [] }] }).success).toBe(false);
    });

    test("a conference and a session are named by their ids, a day by its date and a time block by its start instant", () => {
      expect(around({ subConference: [{ id: "../x", matches: [match] }] }).success).toBe(false);
      expect(around({ session: [{ id: "S 1", matches: [match] }] }).success).toBe(false);
      expect(around({ day: [{ id: "2027-01-12T15:30:00.000Z", matches: [match] }] }).success).toBe(false);
      expect(around({ timeBlock: [{ id: "2027-01-12", matches: [match] }] }).success).toBe(false);
      expect(around({ timeBlock: [{ id: "2027-01-12T08:30:00-07:00", matches: [match] }] }).success).toBe(false);
    });

    test("only the four kinds the improvements show, and no list of matches outside them", () => {
      expect(around({ conference: [] }).success).toBe(false);
      expect(AroundAbstractSchema.safeParse({ abstract: null, abstractTrackIds: [], pools: noPools, matches: [] }).success).toBe(false);
    });
  });

  test("the fixed abstract is named by a talk id", () => {
    expect(FixedAbstractInputSchema.safeParse({ talkId: "493803" }).success).toBe(true);
    expect(FixedAbstractInputSchema.safeParse({ talkId: "../x" }).success).toBe(false);
  });
});
