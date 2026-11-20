// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { SearchView } from "@/components/views/search-view";

import { person, sessionSummary, talkSummary } from "../fixtures";
import { renderApp } from "../render";

const results = { people: [person()], sessions: [sessionSummary()], talks: [talkSummary()] };

test("the search page keeps the query in its box", () => {
  renderApp(<SearchView q="hydrolog" results={results} />);
  expect(screen.getByRole("heading", { level: 1, name: "Search" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Search titles, abstracts, numbers and names" })).toHaveValue("hydrolog");
});

test("results come in people, sessions, then presentations", () => {
  renderApp(<SearchView q="hydrolog" results={results} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["People", "Sessions", "Presentations"]);
  expect(within(screen.getByRole("list")).getByRole("link", { name: "Nicholas Corson-Dosch" })).toHaveAttribute("href", "/people/nicholas-corson-dosch");
  expect(screen.getByRole("link", { name: /^Topical Sessions 173 T104/ })).toHaveAttribute("href", "/sessions/96389");
  expect(screen.getByRole("link", { name: /173-1 Multi-Objective/ })).toHaveAttribute("href", "/talks/16121");
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
