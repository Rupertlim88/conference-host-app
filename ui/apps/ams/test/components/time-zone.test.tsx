// @vitest-environment jsdom
// The choice is remembered for the whole page, so these tests share it and run in order, ending on meeting time.
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { TimeZoneSwitch } from "@/components/time-zone";
import { When } from "@/components/when";

import { renderApp } from "../render";

const talk = <When start="2027-01-11T15:45:00.000Z" mode="time" />;

test("times start in meeting time, and the switch offers the device's zone", () => {
  renderApp(
    <>
      <TimeZoneSwitch />
      {talk}
    </>,
  );
  expect(screen.getByRole("button", { name: "Show times in Local" })).toHaveTextContent("MST");
  expect(screen.getByText("8:45 AM")).toBeInTheDocument();
});

test("pressing the switch shows times in the device's zone, and offers meeting time back", () => {
  renderApp(
    <>
      <TimeZoneSwitch />
      {talk}
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show times in Local" }));
  expect(screen.getByRole("button", { name: "Show times in MST" })).toHaveTextContent("Local");
  expect(screen.getByText("3:45 PM")).toBeInTheDocument();
});

test("the choice is kept when the page renders again, and pressing again returns to meeting time", () => {
  renderApp(
    <>
      <TimeZoneSwitch />
      {talk}
    </>,
  );
  expect(screen.getByText("3:45 PM")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show times in MST" }));
  expect(screen.getByText("8:45 AM")).toBeInTheDocument();
});
