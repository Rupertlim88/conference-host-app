import type { AroundAbstract } from "@repo/host-contracts";
import { beforeEach, expect, test, vi } from "vitest";

import { aroundAbstract, calendarScope } from "@/improvements/matches/matches";

import { sessionSummary, talkSummary } from "./fixtures";

// The backend cannot run outside Next. React remembers the answer for one request only inside Next's server render, so
// that one answer per page is proved in the running app.
const view: AroundAbstract = { abstract: talkSummary(), abstractTrackIds: [], pools: null };
const asked = vi.hoisted(() => [] as unknown[]);
vi.mock("@/shared/server", () => ({ serverApi: async () => ({ improvements: { aroundAbstract: async (scope: unknown) => (asked.push(scope), view) } }) }));

beforeEach(() => {
  asked.length = 0;
});

test("the improvements' answer is the backend's view around the fixed abstract for what the page shows", async () => {
  expect(await aroundAbstract({ session: ["76096"] })).toBe(view);
  expect(asked).toEqual([{ session: ["76096"] }]);
});

test("a calendar day shows its date and the start of each of its time blocks, each once, in the day's order", () => {
  const sessions = [
    sessionSummary({ id: "1", startsAt: "2027-01-12T15:30:00.000Z" }),
    sessionSummary({ id: "2", startsAt: "2027-01-12T15:30:00.000Z" }),
    sessionSummary({ id: "3", startsAt: "2027-01-12T17:00:00.000Z" }),
  ];
  expect(calendarScope("2027-01-12", sessions)).toEqual({ day: ["2027-01-12"], timeBlock: ["2027-01-12T15:30:00.000Z", "2027-01-12T17:00:00.000Z"] });
});

test("a day with no session that has a start shows no time block", () => {
  expect(calendarScope("2027-01-12", [])).toEqual({ day: ["2027-01-12"] });
  expect(calendarScope("2027-01-12", [sessionSummary({ startsAt: null })])).toEqual({ day: ["2027-01-12"] });
});

test("the two calendar improvements, given the same day, name it the same way, so they share one answer", () => {
  const sessions = [sessionSummary({ startsAt: "2027-01-12T15:30:00.000Z" })];
  expect(JSON.stringify(calendarScope("2027-01-12", sessions))).toBe(JSON.stringify(calendarScope("2027-01-12", [...sessions])));
});
