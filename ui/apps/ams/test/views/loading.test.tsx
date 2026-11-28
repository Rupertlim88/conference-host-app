// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { PageLoading } from "@/shared/loading";

import { renderApp } from "../render";

test("a page still loading says so at once, to a screen reader as well, in place of the page", () => {
  const { container } = renderApp(<PageLoading />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0);
});
