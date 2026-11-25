// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { HomeView } from "@/features/frame";

import { meeting } from "../fixtures";
import { renderApp } from "../render";

test("home welcomes the guest to the meeting", () => {
  renderApp(<HomeView meeting={meeting()} />);
  expect(screen.getByRole("heading", { level: 1, name: "Welcome to the 107th AMS Annual Meeting" })).toBeInTheDocument();
  expect(screen.getByText(/^Browse the full programme/)).toBeInTheDocument();
});

test("a Location section names the meeting's venue, and says a session held elsewhere names its building", () => {
  // 39 of the 2027 sessions are in hotels, so the venue is not every session's place.
  renderApp(<HomeView meeting={meeting()} />);
  const location = screen.getByRole("heading", { level: 2, name: "Location" }).parentElement!;
  expect(location).toHaveTextContent("The meeting is held at the Colorado Convention Center, Denver, CO, and online. A session held elsewhere names its building.");
});

test("home leads to each part of the programme", () => {
  renderApp(<HomeView meeting={meeting()} />);
  expect(screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Conferences and Symposia", "/programs"],
    ["Meeting Calendar", "/calendar"],
    ["People", "/people"],
    ["My Schedule", "/schedule"],
    ["Search", "/search"],
  ]);
});
