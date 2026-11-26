// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Logo } from "@/base/frame";

import { renderApp } from "../render";

test("the logo names the demo app, so nobody mistakes it for the society's own", () => {
  renderApp(<Logo />);
  expect(screen.getByText("Isobar Meetings 2027 (Demo)")).toBeInTheDocument();
});
