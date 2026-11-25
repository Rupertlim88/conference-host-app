import { DaySchema } from "@repo/host-contracts";
import { expect, test } from "vitest";

import { firstDay } from "../lib/first-day";

import { meeting } from "./fixtures";

const days = (...dates: string[]) => dates.map((date) => DaySchema.parse({ date, sessions: 1 }));

test("the calendar opens on the meeting's first day, skipping workshops held the week before", () => {
  expect(firstDay(days("2027-01-05", "2027-01-09", "2027-01-10", "2027-01-11"), meeting({ startsOn: "2027-01-10" }))?.date).toBe("2027-01-10");
});

test("if the first meeting day has no sessions, the calendar opens on the next day that has", () => {
  expect(firstDay(days("2027-01-05", "2027-01-11"), meeting({ startsOn: "2027-01-10" }))?.date).toBe("2027-01-11");
});

test("with sessions only before the meeting, it opens on the earliest; with none, there is no day", () => {
  expect(firstDay(days("2027-01-05", "2027-01-06"), meeting({ startsOn: "2027-01-10" }))?.date).toBe("2027-01-05");
  expect(firstDay([], meeting())).toBeUndefined();
});
