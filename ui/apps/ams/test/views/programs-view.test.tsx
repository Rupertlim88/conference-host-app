// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ProgramsList, ProgramsView } from "@/base/programmes";

import { track } from "../fixtures";
import { renderApp } from "../render";

test("every conference and symposium links to its programme, in the order given, under the page's title", () => {
  renderApp(
    <ProgramsView>
      <ProgramsList tracks={[track({ id: "1946", code: "EVENT", title: "Events" }), track()]} />
    </ProgramsView>,
  );
  expect(screen.getByRole("heading", { level: 1, name: "Conferences and Symposia" })).toBeInTheDocument();
  expect(within(screen.getByRole("list")).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Events", "/programs/1946"],
    ["Fourth Symposium on the Future of Weather, Forecasting, and Practice", "/programs/1968"],
  ]);
});
