// @vitest-environment jsdom
// The download itself needs URL.createObjectURL, which jsdom lacks; the Playwright suite checks the file.
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { AddToCalendar } from "@/components/add-to-calendar";

import { renderApp } from "../render";

test("a timed item offers to add it to the guest's calendar", () => {
  renderApp(<AddToCalendar id="173-1" title="Multi-Objective Optimization" start="2026-10-12T19:35:00.000Z" end="2026-10-12T19:55:00.000Z" location="CCC, 111" />);
  expect(screen.getByRole("button", { name: "Add to calendar" })).toBeEnabled();
});

test("an item with no time offers nothing", () => {
  const { container } = renderApp(<AddToCalendar id="x" title="Untimed" start={null} end={null} location="" />);
  expect(container).toBeEmptyDOMElement();
});
