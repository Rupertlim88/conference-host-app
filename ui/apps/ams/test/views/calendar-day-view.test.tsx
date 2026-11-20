// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { CalendarDayView } from "@/components/views/calendar-day-view";

import { days, sessionSummary } from "../fixtures";
import { renderApp } from "../render";

// Real sessions on Tuesday, January 12, 2027.
const breakfast = sessionSummary({ id: "77355", number: "", kind: "Event", title: "Local Chapter Officers' Breakfast", startsAt: "2027-01-12T14:00:00.000Z", endsAt: "2027-01-12T15:30:00.000Z" });
const panel = sessionSummary({ id: "76879", number: "9", kind: "Panel Discussion", title: "A View from the Hill", startsAt: "2027-01-12T15:30:00.000Z", endsAt: "2027-01-12T17:00:00.000Z" });
const lightning = sessionSummary({ id: "76096", number: "5", kind: "Session", title: "Global Lightning Observations and Climatology", startsAt: "2027-01-12T15:30:00.000Z", endsAt: "2027-01-12T17:00:00.000Z" });
const coffee = sessionSummary({ id: "75349", number: "", kind: "Break", title: "Coffee Break", startsAt: "2027-01-12T17:00:00.000Z", endsAt: "2027-01-12T17:45:00.000Z" });

test("the page is titled by its day, with the meeting's days across the top", () => {
  renderApp(<CalendarDayView date="2027-01-12" days={days()} sessions={[]} />);
  expect(screen.getByRole("heading", { level: 1, name: "Tuesday, January 12, 2027" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tue 12" })).toHaveAttribute("aria-current", "date");
});

test("sessions are grouped under their shared time, earliest first", () => {
  renderApp(<CalendarDayView date="2027-01-12" days={days()} sessions={[coffee, panel, lightning, breakfast]} />);
  const order = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(order).toEqual(["7:00 AM - 8:30 AM", "8:30 AM - 10:00 AM", "10:00 AM - 10:45 AM"]);
  const sessionLinks = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/sessions/"));
  expect(sessionLinks.map((a) => a.getAttribute("href"))).toEqual(["/sessions/77355", "/sessions/76879", "/sessions/76096", "/sessions/75349"]);
});

test("a day with no sessions says so", () => {
  renderApp(<CalendarDayView date="2027-01-05" days={days()} sessions={[]} />);
  expect(screen.getByText("No sessions on this day.")).toBeInTheDocument();
});
