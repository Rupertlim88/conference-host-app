// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { When } from "@/features/meeting-time";

import { renderApp } from "../render";

// AMS talk 493803, J1.2: 8:45 AM to 9:00 AM Denver time on Monday, January 11, 2027.
const start = "2027-01-11T15:45:00.000Z";
const end = "2027-01-11T16:00:00.000Z";

test("a day reads as the full date in meeting time", () => {
  renderApp(<When start={start} mode="day" />);
  expect(screen.getByText("Monday, January 11, 2027")).toBeInTheDocument();
});

test("a time reads as the clock time in meeting time", () => {
  renderApp(<When start={start} mode="time" />);
  expect(screen.getByText("8:45 AM")).toBeInTheDocument();
});

test("a range joins start and end with a dash", () => {
  renderApp(<When start={start} end={end} mode="range" />);
  expect(screen.getByText("8:45 AM - 9:00 AM")).toBeInTheDocument();
});

test("a short date names the weekday, month and day", () => {
  renderApp(<When start={start} mode="date" />);
  expect(screen.getByText("Mon, Jan 11")).toBeInTheDocument();
});

test("a range with no end shows the start alone", () => {
  renderApp(<When start={start} end={null} mode="range" />);
  expect(screen.getByText("8:45 AM")).toBeInTheDocument();
});

test("no start shows nothing", () => {
  const { container } = renderApp(<When start={null} mode="time" />);
  expect(container).toBeEmptyDOMElement();
});
