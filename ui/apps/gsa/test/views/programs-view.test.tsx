// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ProgramsView } from "@/components/views/programs-view";

import { track } from "../fixtures";
import { renderApp } from "../render";

test("Filter by Abstract Type lists each type, leading to its sessions", () => {
  renderApp(<ProgramsView tracks={[track({ id: "discipline-economic-geology", title: "Discipline > Economic Geology" }), track()]} />);
  expect(screen.getByRole("heading", { level: 1, name: "Filter by Abstract Type" })).toBeInTheDocument();
  expect(within(screen.getByRole("list")).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Discipline > Economic Geology", "/programs/discipline-economic-geology"],
    ["Discipline > Hydrogeology", "/programs/discipline-hydrogeology"],
  ]);
});
