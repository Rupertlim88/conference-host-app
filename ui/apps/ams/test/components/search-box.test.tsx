// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SearchBox } from "@/base/search";

import { renderApp } from "../render";

test("the search form sends its query to the search page", () => {
  renderApp(<SearchBox initial="storm" />);
  const form = screen.getByRole("search");
  expect(form).toHaveAttribute("action", "/search");
  const field = screen.getByRole("textbox", { name: "Search titles, abstracts, numbers and names" });
  expect(field).toHaveAttribute("name", "q");
  expect(field).toHaveValue("storm");
  expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("type", "submit");
});
