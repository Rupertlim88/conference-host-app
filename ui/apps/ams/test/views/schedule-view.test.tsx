// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ScheduleView } from "@/base/my-schedule";

import { sessionSummary, talkSummary } from "../fixtures";
import { renderApp } from "../render";

test("with nothing starred, My Schedule says how to add something", () => {
  renderApp(<ScheduleView schedule={{ talks: [], sessions: [] }} />);
  expect(screen.getByRole("heading", { level: 1, name: "My Schedule" })).toBeInTheDocument();
  expect(screen.getByText(/^You have not starred anything yet\./)).toBeInTheDocument();
});

test("starred sessions come first, then starred presentations", () => {
  renderApp(<ScheduleView schedule={{ talks: [talkSummary()], sessions: [sessionSummary()] }} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Sessions", "Presentations"]);
  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/sessions/77102", "/talks/493803"]);
  expect(screen.queryByText(/^You have not starred/)).not.toBeInTheDocument();
});

test("only the kinds that have stars get a heading", () => {
  renderApp(<ScheduleView schedule={{ talks: [talkSummary()], sessions: [] }} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Presentations"]);
});
