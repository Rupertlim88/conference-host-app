// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { GroupView } from "@/base/menu";

import { renderApp } from "../render";

test("a group's page lists its sub-items under its name", () => {
  renderApp(<GroupView group="resources" />);
  expect(screen.getByRole("heading", { level: 1, name: "Attendee Resources" })).toBeInTheDocument();
  expect(screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Registration", "/resources/registration"],
    ["Health Resources", "/resources/health-resources"],
    ["Wellness Rooms", "/resources/wellness-rooms"],
    ["Safety Tips", "/resources/safety-tips"],
    ["Transportation", "/resources/transportation"],
    ["Local Restaurants and Attractions", "/resources/local-restaurants"],
  ]);
});
