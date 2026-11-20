// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { TypeView } from "@/components/views/type-view";

import { sessionSummary } from "../fixtures";
import { renderApp } from "../render";

test("a session type is titled by the type and lists its sessions", () => {
  renderApp(<TypeView kind="Topical Sessions" sessions={[sessionSummary()]} />);
  expect(screen.getByRole("heading", { level: 1, name: "Topical Sessions" })).toBeInTheDocument();
  expect(within(screen.getByRole("list")).getByRole("link")).toHaveAttribute("href", "/sessions/96389");
});
