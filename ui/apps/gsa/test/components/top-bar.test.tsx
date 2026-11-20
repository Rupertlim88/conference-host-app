// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { TopBar } from "@/components/top-bar";

import { renderApp } from "../render";

test("the green bar holds the menu, the guide's title, the time-zone switch and sign-out", () => {
  renderApp(<TopBar title="GSA Connects 2026" signOut={<button type="button">Sign Out</button>} />);
  expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  expect(screen.getByText("GSA Connects 2026")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show times in Local" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
});

test("the menu opens from the left under the demo's name and closes when a section is chosen", async () => {
  renderApp(<TopBar title="GSA Connects 2026" signOut={null} />);
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const menu = await screen.findByRole("dialog", { name: "Strata Guide (Demo)" });
  expect(within(menu).getAllByRole("link")).toHaveLength(11);
  fireEvent.click(within(menu).getByRole("link", { name: "Notes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
