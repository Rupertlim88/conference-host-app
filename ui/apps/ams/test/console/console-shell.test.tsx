// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ConsoleShell } from "@/features/console-frame";

import { renderApp } from "../render";

const nav = [
  { href: "/organiser", label: "Papers" },
  { href: "/organiser/sessions", label: "Sessions" },
];

test("names the console, lists its sections and leads back to the attendee app", () => {
  renderApp(
    <ConsoleShell title="Isobar Program Builder (Demo)" nav={nav} signOut={<button type="button">Sign Out</button>}>
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
