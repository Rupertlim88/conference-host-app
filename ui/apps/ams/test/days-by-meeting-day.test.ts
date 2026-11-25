import { expect, test } from "vitest";

import { byMeetingDay } from "../lib/by-meeting-day";

import { sessionSummary } from "./fixtures";

test("sessions group by the meeting-time day they start on, in order, and late evenings stay on their day", () => {
  const evening = sessionSummary({ id: "e", startsAt: "2027-01-12T03:30:00.000Z" }); // 8:30 PM on January 11 in Denver
  const morning = sessionSummary({ id: "m", startsAt: "2027-01-12T15:30:00.000Z" });
  const next = sessionSummary({ id: "n", startsAt: "2027-01-13T15:30:00.000Z" });
  expect(byMeetingDay([evening, morning, next], "America/Denver").map((d) => [d.date, d.sessions.map((s) => s.id)])).toEqual([
    ["2027-01-11", ["e"]],
    ["2027-01-12", ["m"]],
    ["2027-01-13", ["n"]],
  ]);
});

test("sessions with no time come last, under no date", () => {
  const unscheduled = sessionSummary({ id: "u", startsAt: null, endsAt: null });
  expect(byMeetingDay([unscheduled, sessionSummary({ id: "m" })], "America/Denver").map((d) => d.date)).toEqual(["2027-01-11", null]);
});
