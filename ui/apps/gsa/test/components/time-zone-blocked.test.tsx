// @vitest-environment jsdom
// Some browsers refuse storage (private modes, strict settings). The switch must still work on the page.
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import { TimeZoneSwitch } from "@/components/time-zone";
import { When } from "@/components/when";

import { renderApp } from "../render";

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
});

test("with storage blocked, the switch still changes the times shown", () => {
  renderApp(
    <>
      <TimeZoneSwitch />
      <When start="2026-10-12T19:35:00.000Z" mode="time" />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show times in Local" }));
  expect(screen.getByText("7:35 PM")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show times in MT" })).toBeInTheDocument();
});
