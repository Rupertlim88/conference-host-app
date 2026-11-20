// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { PeopleView } from "@/components/views/people-view";

import { person } from "../fixtures";
import { renderApp } from "../render";

const people = [
  person(),
  person({ id: "m-abe", name: "M. Abe", affiliation: "JMA" }),
  person({ id: "josh-storm", name: "Josh Storm", affiliation: "NWS" }),
];

test("a letter for each surname initial leads to that letter's people", () => {
  renderApp(<PeopleView people={people} letter={undefined} />);
  expect(screen.getByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
  const letters = within(screen.getByRole("navigation")).getAllByRole("link");
  expect(letters.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["A", "/people?letter=A"],
    ["S", "/people?letter=S"],
  ]);
  expect(letters[0]).toHaveAccessibleName("Show people starting with A");
});

test("the first letter's people are shown by default, each with their affiliation", () => {
  renderApp(<PeopleView people={people} letter={undefined} />);
  const listed = within(screen.getByRole("list")).getAllByRole("link");
  expect(listed.map((a) => a.getAttribute("href"))).toEqual(["/people/gonzalo-gonzalez-abad", "/people/m-abe"]);
  expect(listed[0]).toHaveAccessibleName("Gonzalo Gonzalez Abad Center for Astrophysics | Harvard & Smithsonian, Cambridge, MA");
});

test("a chosen letter shows its people and is marked; an unknown letter falls back to the first", () => {
  const { unmount } = renderApp(<PeopleView people={people} letter="S" />);
  expect(within(screen.getByRole("list")).getByRole("link", { name: /Josh Storm/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Show people starting with S" })).toHaveAttribute("aria-current", "page");
  unmount();
  renderApp(<PeopleView people={people} letter="Q" />);
  expect(within(screen.getByRole("list")).getAllByRole("link")).toHaveLength(2);
});
