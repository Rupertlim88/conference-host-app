// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { AppShell } from "@/base/frame";

import { meeting } from "../fixtures";
import { renderApp } from "../render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const shell = () =>
  renderApp(
    <AppShell meeting={meeting()} version="base" signOut={<button type="button">Sign Out</button>}>
      <h1>Page</h1>
    </AppShell>,
  );

test("a skip link jumps to the page's content", () => {
  shell();
  expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  expect(within(screen.getByRole("main")).getByRole("heading", { name: "Page" })).toBeInTheDocument();
});

test("the banner names the demo and the meeting, and leads home", () => {
  shell();
  expect(screen.getByRole("link", { name: "Isobar Meetings 2027 (Demo) 107th AMS Annual Meeting Denver, CO" })).toHaveAttribute("href", "/");
});

test("the frame carries the top bar with sign-out, the side menu for computers, and the demo's version bar", () => {
  shell();
  expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  const [sideMenu] = screen.getAllByRole("complementary").filter((el) => !el.hasAttribute("aria-label"));
  expect(within(sideMenu!).getAllByRole("link")).toHaveLength(11);
  expect(within(screen.getByRole("complementary", { name: "Demo" })).getByRole("button", { name: "Switch to Our improvements" })).toBeInTheDocument();
});
