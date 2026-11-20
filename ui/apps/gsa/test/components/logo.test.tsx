// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Logo } from "@/components/logo";

import { renderApp } from "../render";

test("the logo names the demo app, so nobody mistakes it for the society's own", () => {
  renderApp(<Logo />);
  expect(screen.getByText("Strata Guide (Demo)")).toBeInTheDocument();
});
