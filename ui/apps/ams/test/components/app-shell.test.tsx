// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { AppShell } from "@/components/app-shell";

import { meeting } from "../fixtures";
import { renderApp } from "../render";

const shell = () =>
  renderApp(
    <AppShell meeting={meeting()} verifyUrl={null} signOut={<button type="button">Sign Out</button>}>
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

test("the frame carries the top bar with sign-out, and the side menu for computers", () => {
  shell();
  expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  expect(within(screen.getByRole("complementary")).getAllByRole("link")).toHaveLength(8);
});

test("links to the credential verification page in a new tab when one is set, and not otherwise", () => {
  const { unmount } = renderApp(
    <AppShell meeting={meeting()} verifyUrl="https://verify.example.org/" signOut={null}>
      <h1>Page</h1>
    </AppShell>,
  );
  const verify = screen.getByRole("link", { name: "Verify a credential" });
  expect(verify).toHaveAttribute("href", "https://verify.example.org/");
  expect(verify).toHaveAttribute("target", "_blank");
  expect(verify).toHaveAttribute("rel", "noopener noreferrer");
  unmount();
  shell();
  expect(screen.queryByRole("link", { name: "Verify a credential" })).not.toBeInTheDocument();
});
