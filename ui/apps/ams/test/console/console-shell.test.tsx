// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ConsoleShell } from "@/components/console/console-shell";

import { renderApp } from "../render";

const nav = [
  { href: "/organiser", label: "Papers" },
  { href: "/organiser/sessions", label: "Sessions" },
];

test("names the console, lists its sections and leads back to the attendee app", () => {
  renderApp(
    <ConsoleShell title="Isobar Program Builder (Demo)" nav={nav} verifyUrl={null} signOut={<button type="button">Sign Out</button>}>
      <p>page</p>
    </ConsoleShell>,
  );
  expect(screen.getByRole("link", { name: "Isobar Program Builder (Demo)" })).toHaveAttribute("href", "/organiser");
  const links = within(screen.getByRole("navigation", { name: "Console" })).getAllByRole("link");
  expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
    ["Papers", "/organiser"],
    ["Sessions", "/organiser/sessions"],
    ["Attendee app", "/"],
  ]);
  expect(within(screen.getByRole("main")).getByText("page")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
});

test("links to the credential verification page in a new tab when one is set, and not otherwise", () => {
  const { unmount } = renderApp(
    <ConsoleShell title="Console" nav={nav} verifyUrl="https://verify.example.org/" signOut={null}>
      <p>page</p>
    </ConsoleShell>,
  );
  const verify = screen.getByRole("link", { name: "Verify a credential" });
  expect(verify).toHaveAttribute("href", "https://verify.example.org/");
  expect(verify).toHaveAttribute("target", "_blank");
  expect(verify).toHaveAttribute("rel", "noopener noreferrer");
  unmount();
  renderApp(
    <ConsoleShell title="Console" nav={nav} verifyUrl={null} signOut={null}>
      <p>page</p>
    </ConsoleShell>,
  );
  expect(screen.queryByRole("link", { name: "Verify a credential" })).not.toBeInTheDocument();
});
