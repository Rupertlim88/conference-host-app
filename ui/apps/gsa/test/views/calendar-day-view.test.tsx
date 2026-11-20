// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { CalendarDayView } from "@/components/views/calendar-day-view";

import { days, sessionSummary } from "../fixtures";
import { renderApp } from "../render";

test("day tabs across the top link to each day, and the day shown is current", () => {
  renderApp(<CalendarDayView date="2026-10-12" days={days()} sessions={[]} />);
  const tabs = within(screen.getByRole("navigation")).getAllByRole("link");
  expect(tabs.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Sun, Oct 11", "/calendar/2026-10-11"],
    ["Mon, Oct 12", "/calendar/2026-10-12"],
    ["Tue, Oct 13", "/calendar/2026-10-13"],
    ["Wed, Oct 14", "/calendar/2026-10-14"],
  ]);
  expect(screen.getByRole("link", { name: "Mon, Oct 12" })).toHaveAttribute("aria-current", "date");
});

test("the day's sessions follow in the order given", () => {
  renderApp(<CalendarDayView date="2026-10-12" days={days()} sessions={[sessionSummary({ id: "a" }), sessionSummary({ id: "b" })]} />);
  expect(within(screen.getByRole("list")).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/sessions/a", "/sessions/b"]);
});

test("a day with no sessions says so", () => {
  renderApp(<CalendarDayView date="2026-10-11" days={days()} sessions={[]} />);
  expect(screen.getByText("No sessions on this day.")).toBeInTheDocument();
});
