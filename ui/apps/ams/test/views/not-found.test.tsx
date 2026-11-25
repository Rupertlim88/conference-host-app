// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import PageError from "@/app/(app)/error";
import RootError from "@/app/error";
import AppNotFound from "@/app/(app)/not-found";
import NotFound from "@/app/not-found";

import { renderApp } from "../render";

test("an address that matches no page says so, leads home, and is the page's main region", () => {
  renderApp(<NotFound />);
  expect(screen.getByRole("main")).toHaveTextContent("We could not find that page.");
  expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
});

test("an unknown id inside the app says so in the shell's main region, without one of its own", () => {
  renderApp(<AppNotFound />);
  expect(screen.getByText("We could not find that page.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
  expect(screen.queryByRole("main")).not.toBeInTheDocument();
});

test("a failed page says something went wrong, and trying again asks the server afresh", () => {
  const tries: string[] = [];
  renderApp(<PageError reset={() => tries.push("redraw only")} retry={() => tries.push("ask the server again")} />);
  expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(tries).toEqual(["ask the server again"]);
});

test("a failure outside any group's own page, such as in a layout, has a page of its own, as the main region", () => {
  renderApp(<RootError reset={() => {}} retry={() => {}} />);
  expect(screen.getByRole("main")).toHaveTextContent("Something went wrong.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});
