// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { NavLinks } from "@/base/menu";

import { renderApp } from "../render";

const linksIn = (el: HTMLElement) => within(el).getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")]);

test("the menu offers AMS's buttons in AMS's order, and nothing else", () => {
  renderApp(<NavLinks />);
  const nav = screen.getByRole("navigation");
  expect(linksIn(nav)).toEqual([
    ["Home", "/"],
    ["Search", "/search"],
    ["Conferences and Symposia", "/programs"],
    ["Events", "/events"],
    ["Meeting Calendar", "/calendar"],
    ["Participating Program Committees", "/committees"],
    ["Officers of the 107th Annual Meeting", "/officers"],
    ["Main Exhibit Hall", "/exhibit-hall"],
    ["Career Resource and Graduate School Fair", "/career-fair"],
    ["Sponsor Index", "/sponsors"],
    ["Technical Support", "/support"],
  ]);
  expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(["Program Highlights", "General Information", "Attendee Resources"]);
});

test("each group opens to AMS's sub-items, and closes again", () => {
  renderApp(<NavLinks />);
  const highlights = screen.getByRole("button", { name: "Program Highlights" });
  expect(highlights).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(highlights);
  expect(highlights).toHaveAttribute("aria-expanded", "true");
  expect(linksIn(screen.getByRole("list", { name: "Program Highlights" }))).toEqual([
    ["People Themed", "/highlights/people-themed"],
    ["Supplementary Materials", "/highlights/supplementary"],
    ["Core Science Keynotes", "/highlights/keynotes"],
    ["New Fellows", "/highlights/new-fellows"],
    ["Posters", "/highlights/posters"],
    ["Presidential Conference", "/highlights/presidential"],
    ["Town Hall Meetings", "/highlights/town-halls"],
  ]);
  fireEvent.click(screen.getByRole("button", { name: "General Information" }));
  expect(linksIn(screen.getByRole("list", { name: "General Information" })).map(([name]) => name)).toEqual([
    "FAQs", "Information for Presenters", "Policies", "Inclusion and Accessibility", "Green Meetings", "Social Media", "Slack", "Press", "How to Clear Cache",
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Attendee Resources" }));
  expect(linksIn(screen.getByRole("list", { name: "Attendee Resources" })).map(([name]) => name)).toEqual([
    "Registration", "Health Resources", "Wellness Rooms", "Safety Tips", "Transportation", "Local Restaurants and Attractions",
  ]);
  fireEvent.click(highlights);
  expect(screen.queryByRole("list", { name: "Program Highlights" })).not.toBeInTheDocument();
});

test("choosing a button tells the menu to close", () => {
  const closed: string[] = [];
  renderApp(<NavLinks onNavigate={() => closed.push("closed")} />);
  fireEvent.click(screen.getByRole("link", { name: "Events" }));
  fireEvent.click(screen.getByRole("button", { name: "Program Highlights" }));
  fireEvent.click(screen.getByRole("link", { name: "Posters" }));
  expect(closed).toEqual(["closed", "closed"]);
});
