// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { DayStrip } from "@/base/calendar";

import { days } from "../fixtures";
import { renderApp } from "../render";

test("each meeting day links to its calendar page by weekday and date", () => {
  renderApp(<DayStrip days={days()} current="2027-01-12" />);
  const links = within(screen.getByRole("navigation")).getAllByRole("link");
  expect(links.map((l) => l.getAttribute("href"))).toEqual(["/calendar/2027-01-09", "/calendar/2027-01-10", "/calendar/2027-01-11", "/calendar/2027-01-12"]);
  expect(links[0]).toHaveAccessibleName("Sat 9");
  expect(links[3]).toHaveAccessibleName("Tue 12");
});

test("the day shown is marked as the current date", () => {
  renderApp(<DayStrip days={days()} current="2027-01-12" />);
  expect(screen.getByRole("link", { name: "Tue 12" })).toHaveAttribute("aria-current", "date");
  expect(screen.getByRole("link", { name: "Mon 11" })).not.toHaveAttribute("aria-current");
});
