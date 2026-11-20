// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { NavLinks } from "@/components/nav-links";

import { renderApp } from "../render";

test("the menu lists the guide's sections in GSA Meetings Guide's order", () => {
  renderApp(<NavLinks />);
  expect(screen.getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
    ["Home", "/"],
    ["About GSA Connects", "/about"],
    ["Search Abstracts", "/search"],
    ["Schedule: Sessions / Events", "/calendar"],
    ["My Schedule", "/schedule"],
    ["Filter by Abstract Type", "/programs"],
    ["Filter by Session Type", "/types"],
    ["Notes", "/notes"],
    ["Notifications", "/notifications"],
    ["Organiser console", "/organiser"],
    ["Developer console", "/developer"],
  ]);
});

test("choosing a section tells the menu to close", () => {
  const closed: string[] = [];
  renderApp(<NavLinks onNavigate={() => closed.push("closed")} />);
  fireEvent.click(screen.getByRole("link", { name: "Notes" }));
  expect(closed).toEqual(["closed"]);
});
