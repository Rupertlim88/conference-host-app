// @vitest-environment jsdom
// Some browsers let a page read storage but refuse to write to it, for example when it is full. The switch must still
// work on the page.
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import { TimeZoneSwitch, When } from "@/shared/meeting-time";

import { renderApp } from "../render";

beforeEach(() => {
  const refuse = () => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: { getItem: () => null, setItem: refuse, removeItem: refuse },
  });
});

test("with storage that refuses writes, the switch still changes the times shown, both ways", () => {
  renderApp(
    <>
      <TimeZoneSwitch />
      <When start="2027-01-11T15:45:00.000Z" mode="time" />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show times in Local" }));
  expect(screen.getByText("3:45 PM")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show times in MST" }));
  expect(screen.getByText("8:45 AM")).toBeInTheDocument();
});
