import { expect, test } from "vitest";

import { meetingClock } from "@/lib/meeting-clock";

test("an instant reads as the date and 24-hour time in the meeting's zone", () => {
  expect(meetingClock("2026-10-12T19:30:00.000Z", "America/Denver")).toEqual({ date: "2026-10-12", time: "13:30" });
  expect(meetingClock("2026-10-13T05:30:00.000Z", "America/Denver")).toEqual({ date: "2026-10-12", time: "23:30" });
});

test("no instant reads as nothing", () => {
  expect(meetingClock(null, "America/Denver")).toBeNull();
});
