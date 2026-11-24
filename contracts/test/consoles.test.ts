import { describe, expect, test } from "vitest";

import {
  ApiStatusSchema,
  ConnectionTestSchema,
  MoveTalkInputSchema,
  NoteInputSchema,
  SearchInputSchema,
  OrganiserTalkSchema,
  PAGE_SIZE,
  SessionChangeInputSchema,
  SessionListInputSchema,
  SyncRunSchema,
  TalkListInputSchema,
  TalkListSchema,
} from "../src/index";

const talk = {
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
  withdrawn: false,
  change: "none",
  sessionNumber: "J7",
  sessionTitle: "Severe Storms",
};

const run = {
  id: 1,
  state: "sent",
  startedAt: "2026-11-16T10:00:00.000Z",
  finishedAt: "2026-11-16T10:00:20.000Z",
  sent: 3643,
  added: 0,
  changed: 2,
  withdrawn: 1,
  unchanged: 3640,
  programmeVersion: "pv_jjyoujW2yRoabJsIlr-kog",
  error: "",
};

describe("the organiser's talk list", () => {
  test("with nothing given lists every talk from the first page", () => {
    expect(TalkListInputSchema.parse({})).toEqual({ q: "", status: "all", page: 1 });
  });
  test("search text is trimmed and at most 100 characters", () => {
    expect(TalkListInputSchema.parse({ q: "  storm " }).q).toBe("storm");
    expect(TalkListInputSchema.safeParse({ q: "a".repeat(101) }).success).toBe(false);
  });
  test("filters by status: all, scheduled, withdrawn or changed", () => {
    for (const status of ["all", "scheduled", "withdrawn", "changed"]) {
      expect(TalkListInputSchema.safeParse({ status }).success).toBe(true);
    }
    expect(TalkListInputSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
  test("a page is a whole number from 1", () => {
    expect(TalkListInputSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(TalkListInputSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });
  test("a page holds at most 50 talks", () => {
    expect(PAGE_SIZE).toBe(50);
    const page = (n: number) => ({ talks: Array.from({ length: n }, () => talk), total: n, page: 1 });
    expect(TalkListSchema.safeParse(page(50)).success).toBe(true);
    expect(TalkListSchema.safeParse(page(51)).success).toBe(false);
  });
  test("each talk says whether it is withdrawn and how it differs from the published programme", () => {
    expect(OrganiserTalkSchema.safeParse(talk).success).toBe(true);
    for (const change of ["none", "moved", "rescheduled"]) {
      expect(OrganiserTalkSchema.safeParse({ ...talk, change }).success).toBe(true);
    }
    expect(OrganiserTalkSchema.safeParse({ ...talk, change: "deleted" }).success).toBe(false);
  });
});

describe("text that reaches the database", () => {
  test("refuses the NUL character, which Postgres text cannot hold", () => {
    expect(TalkListInputSchema.safeParse({ q: "ab\u0000c" }).success).toBe(false);
    expect(SessionListInputSchema.safeParse({ q: "\u0000" }).success).toBe(false);
    const change = { id: "1", date: "2026-01-27", start: "13:45", end: "15:00" };
    expect(SessionChangeInputSchema.safeParse({ ...change, room: "Hall\u0000A" }).success).toBe(false);
    expect(SearchInputSchema.safeParse({ q: "ab\u0000" }).success).toBe(false);
    expect(NoteInputSchema.safeParse({ targetKind: "talk", targetId: "1", body: "a\u0000" }).success).toBe(false);
  });
});

describe("the organiser's session list", () => {
  test("with nothing given lists every session from the first page", () => {
    expect(SessionListInputSchema.parse({})).toEqual({ q: "", page: 1 });
  });
});

describe("organiser edits", () => {
  test("a move names the talk and the session it goes to", () => {
    expect(MoveTalkInputSchema.safeParse({ id: "464598", sessionId: "73193" }).success).toBe(true);
    expect(MoveTalkInputSchema.safeParse({ id: "464598" }).success).toBe(false);
  });
  test("a session change is a date, a start and end on the 24-hour clock, and a room", () => {
    const change = { id: "73193", date: "2026-01-27", start: "13:45", end: "15:00", room: " 350D " };
    expect(SessionChangeInputSchema.parse(change).room).toBe("350D");
    for (const start of ["1:45", "24:00", "13:60", "1:45 PM"]) {
      expect(SessionChangeInputSchema.safeParse({ ...change, start }).success).toBe(false);
    }
    expect(SessionChangeInputSchema.safeParse({ ...change, date: "2026-02-30" }).success).toBe(false);
    expect(SessionChangeInputSchema.safeParse({ ...change, room: "r".repeat(201) }).success).toBe(false);
  });
  test("a session's times may be left empty, for a session with no time or no end", () => {
    const room = { id: "96234", room: "Hall B" };
    expect(SessionChangeInputSchema.safeParse({ ...room, date: "", start: "", end: "" }).success).toBe(true);
    expect(SessionChangeInputSchema.safeParse({ ...room, date: "2026-10-12", start: "13:30", end: "" }).success).toBe(true);
  });
});

describe("sending the programme", () => {
  test("a run is running, sent, failed or interrupted", () => {
    expect(SyncRunSchema.safeParse(run).success).toBe(true);
    expect(SyncRunSchema.safeParse({ ...run, state: "running", finishedAt: null }).success).toBe(true);
    expect(SyncRunSchema.safeParse({ ...run, state: "queued" }).success).toBe(false);
  });
});

describe("the developer console", () => {
  test("status shows the address, whether a key is set, the last run and the changes", () => {
    const status = {
      apiAddress: "https://api.example.org/",
      keySet: true,
      lastRun: run,
      changes: { moved: 1, rescheduled: 2, withdrawn: 1, sessions: 1 },
    };
    expect(ApiStatusSchema.safeParse(status).success).toBe(true);
    expect(ApiStatusSchema.safeParse({ ...status, lastRun: null }).success).toBe(true);
  });
  test("a connection test names one outcome", () => {
    for (const status of ["ok", "not-set", "refused-key", "no-programme", "unreachable", "unexpected-answer"]) {
      expect(ConnectionTestSchema.safeParse({ status, httpStatus: null, ms: null }).success).toBe(true);
    }
    expect(ConnectionTestSchema.safeParse({ status: "slow", httpStatus: null, ms: null }).success).toBe(false);
  });
});
