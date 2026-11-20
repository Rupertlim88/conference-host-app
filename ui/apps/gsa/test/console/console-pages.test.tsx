// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import DeveloperError from "@/app/(developer)/error";
import DeveloperNotFound from "@/app/(developer)/not-found";
import OrganiserError from "@/app/(organiser)/error";
import OrganiserNotFound from "@/app/(organiser)/not-found";

import { renderApp } from "../render";

test.each([
  ["organiser", OrganiserNotFound],
  ["developer", DeveloperNotFound],
])("an unknown id in the %s console says so inside the console's main region", (_, NotFound) => {
  renderApp(<NotFound />);
  expect(screen.getByText("We could not find that page.")).toBeInTheDocument();
  expect(screen.queryByRole("main")).not.toBeInTheDocument();
});

test.each([
  ["organiser", OrganiserError],
  ["developer", DeveloperError],
])("a failed %s page can try again", (_, PageError) => {
  const tries: string[] = [];
  renderApp(<PageError reset={() => tries.push("again")} />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(tries).toEqual(["again"]);
});
