// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { HighlightView } from "@/base/highlights";

import { sessionSummary, talkSummary } from "../fixtures";
import { renderApp } from "../render";

test("a list of talks shows each talk under the list's name", () => {
  renderApp(<HighlightView list="keynotes" highlight={{ sessions: [], talks: [talkSummary()] }} />);
  expect(screen.getByRole("heading", { level: 1, name: "Core Science Keynotes" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /What is a Snow Squall/ })).toHaveAttribute("href", `/talks/${talkSummary().id}`);
});

test("a list of sessions shows each session, by day", () => {
  renderApp(<HighlightView list="themed" highlight={{ sessions: [sessionSummary()], talks: [] }} />);
  expect(screen.getByRole("heading", { level: 1, name: "People Themed" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Monday, January 11, 2027" })).toBeInTheDocument();
  expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", `/sessions/${sessionSummary().id}`);
});

test("an empty list says so", () => {
  renderApp(<HighlightView list="fellows" highlight={{ sessions: [], talks: [] }} />);
  expect(screen.getByRole("heading", { level: 1, name: "New Fellows" })).toBeInTheDocument();
  expect(screen.getByText("Nothing is listed here yet.")).toBeInTheDocument();
});
