// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { When } from "@/components/when";

import { renderApp } from "../render";

// GSA talk 16121, 173-1: 1:35 PM to 1:55 PM Denver time on Monday, October 12, 2026.
const start = "2026-10-12T19:35:00.000Z";
const end = "2026-10-12T19:55:00.000Z";

test("a day reads as the full date in meeting time", () => {
  renderApp(<When start={start} mode="day" />);
  expect(screen.getByText("Monday, October 12, 2026")).toBeInTheDocument();
});

test("a time reads as the clock time in meeting time", () => {
  renderApp(<When start={start} mode="time" />);
  expect(screen.getByText("1:35 PM")).toBeInTheDocument();
});

test("a range joins start and end with a dash", () => {
  renderApp(<When start={start} end={end} mode="range" />);
  expect(screen.getByText("1:35 PM - 1:55 PM")).toBeInTheDocument();
});

test("a short date names the weekday, month and day", () => {
  renderApp(<When start={start} mode="date" />);
  expect(screen.getByText("Mon, Oct 12")).toBeInTheDocument();
});

test("a range with no end shows the start alone", () => {
  renderApp(<When start={start} end={null} mode="range" />);
  expect(screen.getByText("1:35 PM")).toBeInTheDocument();
});

test("no start shows nothing", () => {
  const { container } = renderApp(<When start={null} mode="time" />);
  expect(container).toBeEmptyDOMElement();
});
