// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";


import { renderApp } from "../render";
import { InfoBox } from "@/features/cards";

const definitions = () => screen.getAllByRole("definition").map((d) => d.textContent);

test("lists the day, the time range and the room with its building", () => {
  renderApp(<InfoBox start="2027-01-11T15:45:00.000Z" end="2027-01-11T16:00:00.000Z" room="403" building="Colorado Convention Center" />);
  expect(definitions()).toEqual(["Monday, January 11, 2027", "8:45 AM - 9:00 AM", "403 (Colorado Convention Center)"]);
});

test("a room with no building is shown alone, and no room means no place line", () => {
  const { unmount } = renderApp(<InfoBox start="2027-01-11T15:45:00.000Z" end={null} room="403" building="" />);
  expect(definitions()).toEqual(["Monday, January 11, 2027", "8:45 AM", "403"]);
  unmount();
  renderApp(<InfoBox start="2027-01-11T15:45:00.000Z" end={null} room="" building="" />);
  expect(definitions()).toEqual(["Monday, January 11, 2027", "8:45 AM"]);
});

test("with no time, only the place is shown", () => {
  renderApp(<InfoBox start={null} end={null} room="Hall A" building="" />);
  expect(definitions()).toEqual(["Hall A"]);
});

test("each line is named for screen readers, as valid list markup", () => {
  renderApp(<InfoBox start="2027-01-11T15:45:00.000Z" end="2027-01-11T16:00:00.000Z" room="403" building="" />);
  expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["Day", "Time", "Place"]);
});

test("with no time and no room, there is no box at all", () => {
  const { container } = renderApp(<InfoBox start={null} end={null} room="" building="" />);
  expect(container).toBeEmptyDOMElement();
});
