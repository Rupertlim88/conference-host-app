import { expect, test } from "vitest";
import { meetingClock, sessionFields } from "@/consoles/console-frame";


test("an instant reads as the date and 24-hour time in the meeting's zone", () => {
  expect(meetingClock("2027-01-11T15:30:00.000Z", "America/Denver")).toEqual({ date: "2027-01-11", time: "08:30" });
  expect(meetingClock("2027-01-12T05:30:00.000Z", "America/Denver")).toEqual({ date: "2027-01-11", time: "22:30" });
});

test("no instant reads as nothing", () => {
  expect(meetingClock(null, "America/Denver")).toBeNull();
});

test("a session's stored times fill the session form's fields in meeting time, and no time leaves them blank", () => {
  expect(sessionFields({ startsAt: "2027-01-11T15:30:00.000Z", endsAt: "2027-01-11T17:00:00.000Z", room: "403" })).toEqual({
    date: "2027-01-11",
    start: "08:30",
    end: "10:00",
    room: "403",
  });
  expect(sessionFields({ startsAt: null, endsAt: null, room: "" })).toEqual({ date: "", start: "", end: "", room: "" });
});
