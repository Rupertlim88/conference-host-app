// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ConsoleShell } from "@/components/console/console-shell";

import { renderApp } from "../render";

const nav = [
  { href: "/organiser", label: "Submissions" },
  { href: "/organiser/sessions", label: "Manage Sessions" },
];

test("names the console, lists its sections and leads back to the attendee app", () => {
  renderApp(
    <ConsoleShell title="Strata Program Desk (Demo)" nav={nav} signOut={<button type="button">Sign Out</button>}>
      <p>page</p>
    </ConsoleShell>,
  );
  expect(screen.getByRole("link", { name: "Strata Program Desk (Demo)" })).toHaveAttribute("href", "/organiser");
  const links = within(screen.getByRole("navigation", { name: "Console" })).getAllByRole("link");
  expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
    ["Submissions", "/organiser"],
    ["Manage Sessions", "/organiser/sessions"],
    ["Attendee app", "/"],
  ]);
  expect(within(screen.getByRole("main")).getByText("page")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
});
