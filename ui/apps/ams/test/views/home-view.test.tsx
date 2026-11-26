// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { HomeView } from "@/base/menu";

import { renderApp } from "../render";

test("home welcomes the guest in the demo's own words, with none of AMS's content", () => {
  renderApp(<HomeView />);
  expect(screen.getByRole("heading", { level: 1, name: "Welcome to the 107th AMS Annual Meeting" })).toBeInTheDocument();
  expect(screen.getByText("Explore the programme with the tiles below or the menu.")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Location" })).not.toBeInTheDocument();
});

test("home shows AMS's ten tiles, in AMS's order, each with an icon", () => {
  renderApp(<HomeView />);
  const tiles = screen.getAllByRole("link");
  expect(tiles.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Conferences and Symposia", "/programs"],
    ["Events", "/events"],
    ["Meeting Calendar", "/calendar"],
    ["Participating Program Committees", "/committees"],
    ["Officers of the 107th Annual Meeting", "/officers"],
    ["Main Exhibit Hall", "/exhibit-hall"],
    ["Career Resource and Graduate School Fair", "/career-fair"],
    ["Program Highlights", "/highlights"],
    ["General Information", "/information"],
    ["Attendee Resources", "/resources"],
  ]);
  for (const tile of tiles) expect(tile.querySelector("svg")).not.toBeNull();
});
