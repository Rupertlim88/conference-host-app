// @vitest-environment jsdom
import type { Target } from "@repo/host-contracts";
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { StarToggle } from "@/components/star-toggle";

import { renderApp } from "../render";

const talk: Target = { targetKind: "talk", targetId: "493803" };
const session: Target = { targetKind: "session", targetId: "77102" };

function toggle(starred: Target[] | undefined, busy = false) {
  const asked: string[] = [];
  const record = (verb: string) => (t: Target) => asked.push(`${verb} ${t.targetKind} ${t.targetId}`);
  renderApp(<StarToggle target={talk} starred={starred} busy={busy} onStar={record("star")} onUnstar={record("unstar")} />);
  return asked;
}

test("an unstarred talk offers to add it, and pressing asks to star that talk", () => {
  const asked = toggle([]);
  const button = screen.getByRole("button", { name: "Add to My Schedule" });
  expect(button).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(button);
  expect(asked).toEqual(["star talk 493803"]);
});

test("a starred talk offers to remove it, and pressing asks to unstar it", () => {
  const asked = toggle([talk]);
  const button = screen.getByRole("button", { name: "Remove from My Schedule" });
  expect(button).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(button);
  expect(asked).toEqual(["unstar talk 493803"]);
});

test("a starred session with the same id does not star the talk", () => {
  toggle([session]);
  expect(screen.getByRole("button", { name: "Add to My Schedule" })).toBeInTheDocument();
});

test("while the stars load or a change saves, the star cannot be pressed", () => {
  toggle(undefined);
  expect(screen.getByRole("button", { name: "Add to My Schedule" })).toBeDisabled();
});

test("while a change saves, the star cannot be pressed again", () => {
  toggle([talk], true);
  expect(screen.getByRole("button", { name: "Remove from My Schedule" })).toBeDisabled();
});
