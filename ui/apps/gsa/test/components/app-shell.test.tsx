// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { AppShell } from "@/components/app-shell";

import { meeting } from "../fixtures";
import { renderApp } from "../render";

const shell = () =>
  renderApp(
    <AppShell meeting={meeting()} signOut={<button type="button">Sign Out</button>}>
      <h1>Page</h1>
    </AppShell>,
  );

test("a skip link jumps to the page's content", () => {
  shell();
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  expect(within(screen.getByRole("main")).getByRole("heading", { name: "Page" })).toBeInTheDocument();
});

test("the bar is titled by the meeting and carries sign-out", () => {
  shell();
  expect(screen.getByText("GSA Connects 2026")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
});

test("on computers the side panel shows the demo's name and the menu", () => {
  shell();
  const panel = screen.getByRole("complementary");
  expect(within(panel).getByText("Strata Guide (Demo)")).toBeInTheDocument();
  expect(within(panel).getAllByRole("link")).toHaveLength(11);
});
