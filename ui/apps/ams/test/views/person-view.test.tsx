// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { PersonView } from "@/features/people";

import { personDetail } from "../fixtures";
import { renderApp } from "../render";

test("a person is titled by name under their affiliation, with their presentations", () => {
  renderApp(<PersonView person={personDetail()} />);
  expect(screen.getByRole("heading", { level: 1, name: "Gonzalo Gonzalez Abad" })).toBeInTheDocument();
  expect(screen.getByText("Center for Astrophysics | Harvard & Smithsonian, Cambridge, MA")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Presentations" })).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/talks/493803");
});
