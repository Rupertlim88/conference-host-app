// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { FixedAbstractControl } from "@/consoles/developer";

import { talkSummary } from "../fixtures";
import { renderApp } from "../render";

const section = () => screen.getByRole("heading", { level: 2, name: "The demo's abstract" }).parentElement!;

test("shows the abstract the demo is fixed to, and fixes it to the talk id typed", () => {
  const fixed: string[] = [];
  renderApp(<FixedAbstractControl abstract={talkSummary()} busy={false} refused={false} onFix={(id) => fixed.push(id)} />);
  expect(section()).toHaveTextContent("J1.2 - What is a Snow Squall?");
  fireEvent.change(screen.getByLabelText("Talk id"), { target: { value: " 493803 " } });
  fireEvent.click(screen.getByRole("button", { name: "Fix the demo to this talk" }));
  expect(fixed).toEqual(["493803"]);
});

test("cannot be pressed while saving or with no id, and says why a talk was refused", () => {
  const { rerender } = renderApp(<FixedAbstractControl abstract={null} busy={true} refused={false} onFix={() => {}} />);
  expect(screen.getByText("No talk with an abstract yet.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Fix the demo to this talk" })).toBeDisabled();
  rerender(<FixedAbstractControl abstract={null} busy={false} refused={true} onFix={() => {}} />);
  expect(screen.getByRole("button", { name: "Fix the demo to this talk" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("That talk cannot be the demo's abstract: it must be shown, and have an abstract.");
});
