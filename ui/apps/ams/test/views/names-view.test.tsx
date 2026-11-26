// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { NamesView } from "@/base/names";

import { renderApp } from "../render";

test("a page of names shows each heading with its lines, in order", () => {
  renderApp(
    <NamesView
      page="officers"
      sections={[
        { heading: "Local Organizing Committee", lines: ["Melissa Burt and Scott Mackaro, Co-Chairs", "Stephanie Herring"] },
        { heading: "Program Chairpersons", lines: ["Nick Albers"] },
      ]}
    />,
  );
  expect(screen.getByRole("heading", { level: 1, name: "Officers of the 107th Annual Meeting" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Local Organizing Committee", "Program Chairpersons"]);
  expect(screen.getByText("Stephanie Herring")).toBeInTheDocument();
});

test("the committees page is named as AMS names it", () => {
  renderApp(<NamesView page="committees" sections={[]} />);
  expect(screen.getByRole("heading", { level: 1, name: "Participating Program Committees" })).toBeInTheDocument();
  expect(screen.getByText("Nothing is listed here yet.")).toBeInTheDocument();
});
