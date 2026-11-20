// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { AboutView } from "@/components/views/about-view";

import { meeting } from "../fixtures";
import { renderApp } from "../render";

test("About names the meeting, its dates and place, and what it is", () => {
  renderApp(<AboutView meeting={meeting()} />);
  expect(screen.getByRole("heading", { level: 1, name: "GSA Connects 2026" })).toBeInTheDocument();
  expect(screen.getByText("October 11 – 14, 2026")).toBeInTheDocument();
  expect(screen.getByText("Colorado Convention Center, Denver, CO")).toBeInTheDocument();
  expect(screen.getByText(/^The Geological Society of America's annual meeting/)).toBeInTheDocument();
});
