import { DaySchema } from "@repo/host-contracts";
import { expect, test } from "vitest";

import { byMeetingDay, firstDay } from "../lib/days";

import { meeting, sessionSummary } from "./fixtures";

const days = (...dates: string[]) => dates.map((date) => DaySchema.parse({ date, sessions: 1 }));

test("the schedule opens on the meeting's first day, skipping field trips held the days before", () => {
  expect(firstDay(days("2026-10-07", "2026-10-10", "2026-10-11", "2026-10-12"), meeting())?.date).toBe("2026-10-11");
});

test("if the first meeting day has no sessions, the schedule opens on the next day that has", () => {
  expect(firstDay(days("2026-10-07", "2026-10-12"), meeting())?.date).toBe("2026-10-12");
});

test("with sessions only before the meeting, it opens on the earliest; with none, there is no day", () => {
  expect(firstDay(days("2026-10-07", "2026-10-08"), meeting())?.date).toBe("2026-10-07");
  expect(firstDay([], meeting())).toBeUndefined();
});

test("sessions group by the Denver day they start on, in order, and late evenings stay on their day", () => {
  const evening = sessionSummary({ id: "e", startsAt: "2026-10-12T03:30:00.000Z" }); // 9:30 PM on October 11 in Denver
  const morning = sessionSummary({ id: "m", startsAt: "2026-10-12T14:00:00.000Z" });
  expect(byMeetingDay([morning, evening], "America/Denver").map((d) => [d.date, d.sessions.map((s) => s.id)])).toEqual([
    ["2026-10-11", ["e"]],
    ["2026-10-12", ["m"]],
  ]);
});

test("sessions with no time come last, under no date", () => {
  expect(byMeetingDay([sessionSummary({ id: "u", startsAt: null, endsAt: null }), sessionSummary()], "America/Denver").map((d) => d.date)).toEqual(["2026-10-12", null]);
});
