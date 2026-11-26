// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { NavLinks } from "@/base/frame";

import { renderApp } from "../render";

test("the menu lists the app's sections in the meeting app's order", () => {
  renderApp(<NavLinks />);
  const links = screen.getAllByRole("link");
  expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
    ["Home", "/"],
    ["Conferences and Symposia", "/programs"],
    ["Meeting Calendar", "/calendar"],
    ["People", "/people"],
    ["My Schedule", "/schedule"],
    ["Search", "/search"],
    ["Organiser console", "/organiser"],
    ["Developer console", "/developer"],
  ]);
});

test("choosing a section tells the menu to close", () => {
  const closed: string[] = [];
  renderApp(<NavLinks onNavigate={() => closed.push("closed")} />);
  fireEvent.click(screen.getByRole("link", { name: "My Schedule" }));
  expect(closed).toEqual(["closed"]);
});
