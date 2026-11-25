// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { SearchView } from "@/features/search";

import { person, sessionSummary, talkSummary } from "../fixtures";
import { renderApp } from "../render";

const results = { people: [person({ id: "josh-storm", name: "Josh Storm" })], sessions: [sessionSummary()], talks: [talkSummary()] };

test("the search page keeps the query in its box", () => {
  renderApp(<SearchView q="storm" results={results} />);
  expect(screen.getByRole("heading", { level: 1, name: "Search" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Search titles, abstracts, numbers and names" })).toHaveValue("storm");
});

test("results come in people, sessions, then presentations", () => {
  renderApp(<SearchView q="storm" results={results} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["People", "Sessions", "Presentations"]);
  expect(within(screen.getByRole("list")).getByRole("link", { name: "Josh Storm" })).toHaveAttribute("href", "/people/josh-storm");
  expect(screen.getByRole("link", { name: /^Joint Session J1/ })).toHaveAttribute("href", "/sessions/77102");
  expect(screen.getByRole("link", { name: /J1\.2 What is a Snow Squall/ })).toHaveAttribute("href", "/talks/493803");
});

test("a search with no results says nothing matches the query", () => {
  renderApp(<SearchView q="zzzqqq" results={{ people: [], sessions: [], talks: [] }} />);
  expect(screen.getByText("Nothing matches “zzzqqq”.")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
});

test("a query too short to search asks for two characters; no query shows only the box", () => {
  const { unmount } = renderApp(<SearchView q="s" results={null} />);
  expect(screen.getByText("Type at least two characters.")).toBeInTheDocument();
  unmount();
  renderApp(<SearchView q="" results={null} />);
  expect(screen.queryByText("Type at least two characters.")).not.toBeInTheDocument();
  expect(screen.getByRole("search")).toBeInTheDocument();
});
