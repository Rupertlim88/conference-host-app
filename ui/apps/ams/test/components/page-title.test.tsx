// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { PageTitle } from "@/components/page-title";

import { renderApp } from "../render";

test("the title is the page's one top heading", () => {
  renderApp(<PageTitle>Meeting Calendar</PageTitle>);
  expect(screen.getByRole("heading", { level: 1, name: "Meeting Calendar" })).toBeInTheDocument();
});

test("an eyebrow line names what the page belongs to, above the title", () => {
  renderApp(<PageTitle eyebrow="Fourth Symposium on the Future of Weather, Forecasting, and Practice">Joint Session J1</PageTitle>);
  const eyebrow = screen.getByText("Fourth Symposium on the Future of Weather, Forecasting, and Practice");
  expect(eyebrow.compareDocumentPosition(screen.getByRole("heading", { level: 1 }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});
