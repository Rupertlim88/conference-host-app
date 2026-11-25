// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { TopBar } from "@/features/frame";

import { renderApp } from "../render";

test("the grey bar holds sign-out, the time-zone switch, search and the menu", () => {
  renderApp(<TopBar signOut={<button type="button">Sign Out</button>} />);
  expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show times in Local" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/search");
  expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
});

test("the menu opens on the app's sections and closes when one is chosen", async () => {
  renderApp(<TopBar signOut={null} />);
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const menu = await screen.findByRole("dialog", { name: "Menu" });
  expect(within(menu).getAllByRole("link")).toHaveLength(8);
  fireEvent.click(within(menu).getByRole("link", { name: "My Schedule" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
