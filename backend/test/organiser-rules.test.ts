import { describe, expect, test } from "vitest";

import { placeInSession, sessionShift, sessionTimesProblem } from "../src/organiser-rules";


const at = (hhmm: string) => new Date(`2026-01-27T${hhmm}:00.000Z`);
const session = { startsAt: at("13:30"), endsAt: at("15:00"), room: "350D", building: "GRB" };
const oral = { kind: "oral", startsAt: at("09:00"), endsAt: at("09:15") };

describe("placeInSession", () => {
  test("a talk takes the session's room and building and goes after its last talk", () => {
    expect(placeInSession(oral, session, { lastEnd: at("14:00"), lastSort: 4 })).toEqual({
      startsAt: at("14:00"),
      endsAt: at("14:15"),
      room: "350D",
      building: "GRB",
      sort: 5,
    });
  });
  test("in an empty session a talk starts when the session starts and sorts first", () => {
    expect(placeInSession(oral, session, { lastEnd: null, lastSort: null })).toMatchObject({
      startsAt: at("13:30"),
      endsAt: at("13:45"),
      sort: 1,
    });
  });
  test("a talk never starts before the session, even when the last talk ended earlier", () => {
    expect(placeInSession(oral, session, { lastEnd: at("12:00"), lastSort: 1 }).startsAt).toEqual(at("13:30"));
  });
  test("a poster takes the session's times", () => {
    const poster = { ...oral, kind: "poster" };
    expect(placeInSession(poster, session, { lastEnd: at("14:00"), lastSort: 9 })).toMatchObject({
      startsAt: at("13:30"),
      endsAt: at("15:00"),
      sort: 10,
    });
  });
  test("a talk with no length takes the session's times", () => {
    for (const talk of [
      { kind: "oral", startsAt: at("09:00"), endsAt: null },
      { kind: "oral", startsAt: null, endsAt: null },
      { kind: "oral", startsAt: at("09:00"), endsAt: at("09:00") },
    ]) {
      expect(placeInSession(talk, session, { lastEnd: at("14:00"), lastSort: 1 })).toMatchObject({
        startsAt: at("13:30"),
        endsAt: at("15:00"),
      });
    }
  });
  test("a session with no time gives a talk with no time", () => {
    const untimed = { ...session, startsAt: null, endsAt: null };
    expect(placeInSession(oral, untimed, { lastEnd: null, lastSort: 2 })).toMatchObject({
      startsAt: null,
      endsAt: null,
      sort: 3,
    });
  });
});

describe("sessionShift", () => {
  test("is how far the session's start moved", () => {
    expect(sessionShift(at("13:30"), at("14:00"))).toBe(30 * 60_000);
    expect(sessionShift(at("13:30"), at("13:00"))).toBe(-30 * 60_000);
  });
  test("is null when the session had no start, or now has none", () => {
    expect(sessionShift(null, at("14:00"))).toBeNull();
    expect(sessionShift(at("13:30"), null)).toBeNull();
  });
});

describe("sessionTimesProblem", () => {
  const meeting = { startsOn: "2026-01-25", endsOn: "2026-01-29" };
  test("accepts a session that ends after it starts, during the meeting", () => {
    expect(sessionTimesProblem(meeting, { date: "2026-01-27", start: "13:30", end: "15:00" })).toBeNull();
  });
  test("refuses an end that is not after the start", () => {
    expect(sessionTimesProblem(meeting, { date: "2026-01-27", start: "13:30", end: "13:30" })).toBe("end-before-start");
    expect(sessionTimesProblem(meeting, { date: "2026-01-27", start: "13:30", end: "09:00" })).toBe("end-before-start");
  });
  test("accepts no time at all, and a start with no end", () => {
    expect(sessionTimesProblem(meeting, { date: "", start: "", end: "" })).toBeNull();
    expect(sessionTimesProblem(meeting, { date: "2026-01-27", start: "13:30", end: "" })).toBeNull();
  });
  test("refuses a date without a start, a start without a date, and an end without both", () => {
    for (const times of [
      { date: "2026-01-27", start: "", end: "" },
      { date: "", start: "13:30", end: "" },
      { date: "", start: "", end: "14:00" },
    ]) {
      expect(sessionTimesProblem(meeting, times)).toBe("incomplete-time");
    }
  });
  test("allows a day either side of the meeting and refuses anything further out", () => {
    expect(sessionTimesProblem(meeting, { date: "2026-01-24", start: "09:00", end: "10:00" })).toBeNull();
    expect(sessionTimesProblem(meeting, { date: "2026-01-30", start: "09:00", end: "10:00" })).toBeNull();
    expect(sessionTimesProblem(meeting, { date: "2026-01-23", start: "09:00", end: "10:00" })).toBe("outside-meeting");
    expect(sessionTimesProblem(meeting, { date: "2026-01-31", start: "09:00", end: "10:00" })).toBe("outside-meeting");
  });
});

