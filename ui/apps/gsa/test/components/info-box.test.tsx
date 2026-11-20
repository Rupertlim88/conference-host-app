// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { InfoBox } from "@/components/info-box";

import { renderApp } from "../render";

const definitions = () => screen.getAllByRole("definition").map((d) => d.textContent);

test("lists the day, the time range and the room", () => {
  renderApp(<InfoBox start="2026-10-12T19:35:00.000Z" end="2026-10-12T19:55:00.000Z" room="CCC, 111" building="" />);
  expect(definitions()).toEqual(["Monday, October 12, 2026", "1:35 PM - 1:55 PM", "CCC, 111"]);
});

test("a building is shown in brackets after the room, and no room means no place line", () => {
  const { unmount } = renderApp(<InfoBox start="2026-10-12T19:35:00.000Z" end={null} room="Ballroom" building="Hyatt Regency" />);
  expect(definitions()).toEqual(["Monday, October 12, 2026", "1:35 PM", "Ballroom (Hyatt Regency)"]);
  unmount();
  renderApp(<InfoBox start="2026-10-12T19:35:00.000Z" end={null} room="" building="" />);
  expect(definitions()).toEqual(["Monday, October 12, 2026", "1:35 PM"]);
});

test("with no time, only the place is shown", () => {
  renderApp(<InfoBox start={null} end={null} room="CCC, Hall F" building="" />);
  expect(definitions()).toEqual(["CCC, Hall F"]);
});
