// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { HomeView } from "@/components/views/home-view";

import { meeting } from "../fixtures";
import { renderApp } from "../render";

test("the guide's home shows the city picture, the meeting's name and its dates", () => {
  renderApp(<HomeView meeting={meeting()} />);
  expect(screen.getByRole("img", { name: "Denver, CO" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "GSA Connects 2026" })).toBeInTheDocument();
  expect(screen.getByText("Oct 11 – 14, 2026")).toBeInTheDocument();
});

test("details and location follow under their headings", () => {
  renderApp(<HomeView meeting={meeting()} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Details", "Location"]);
  expect(screen.getByText(/^Stay connected and make the most of the GSA Connects 2026 meeting/)).toBeInTheDocument();
  expect(screen.getByText("Colorado Convention Center")).toBeInTheDocument();
  expect(screen.getByText("Denver, CO")).toBeInTheDocument();
});
