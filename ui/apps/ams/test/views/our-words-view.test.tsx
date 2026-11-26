// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { OUR_WORDS_PAGES, OurWordsView } from "@/base/our-words";

import { renderApp } from "../render";

test("every page in the demo's own words has a title and a short text", () => {
  expect(OUR_WORDS_PAGES).toHaveLength(16);
  for (const page of OUR_WORDS_PAGES) {
    const { unmount } = renderApp(<OurWordsView page={page} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe("");
    expect(screen.getByText(/the demo leaves/i)).toBeInTheDocument();
    unmount();
  }
});

test("Technical Support is one of them", () => {
  renderApp(<OurWordsView page="support" />);
  expect(screen.getByRole("heading", { level: 1, name: "Technical Support" })).toBeInTheDocument();
});
