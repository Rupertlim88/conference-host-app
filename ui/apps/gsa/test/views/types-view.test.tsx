// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { TypesView } from "@/components/views/types-view";

import { renderApp } from "../render";

test("Filter by Session Type lists each type with its count, leading to its sessions", () => {
  renderApp(<TypesView kinds={[{ kind: "Field Trip", sessions: 20 }, { kind: "GSA Divisions/Cmte/Sections", sessions: 32 }]} />);
  expect(screen.getByRole("heading", { level: 1, name: "Filter by Session Type" })).toBeInTheDocument();
  const links = within(screen.getByRole("list")).getAllByRole("link");
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["/types/Field%20Trip", "/types/GSA%20Divisions%2FCmte%2FSections"]);
  expect(links[0]).toHaveAccessibleName("Field Trip 20");
});
