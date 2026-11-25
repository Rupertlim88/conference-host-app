import { expect, test } from "vitest";
import { meetingClock } from "@/features/console-frame";


test("an instant reads as the date and 24-hour time in the meeting's zone", () => {
  expect(meetingClock("2027-01-11T15:30:00.000Z", "America/Denver")).toEqual({ date: "2027-01-11", time: "08:30" });
  expect(meetingClock("2027-01-12T05:30:00.000Z", "America/Denver")).toEqual({ date: "2027-01-11", time: "22:30" });
});

test("no instant reads as nothing", () => {
  expect(meetingClock(null, "America/Denver")).toBeNull();
});
