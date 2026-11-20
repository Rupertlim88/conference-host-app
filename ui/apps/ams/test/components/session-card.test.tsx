// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SessionCard } from "@/components/session-card";

import { sessionSummary } from "../fixtures";
import { renderApp } from "../render";

test("a session card links to its session and reads label, title, then place", () => {
  renderApp(<SessionCard session={sessionSummary({ id: "76879", number: "9", kind: "Panel Discussion", title: "A View from the Hill", room: "302" })} />);
  const card = screen.getByRole("link");
  expect(card).toHaveAttribute("href", "/sessions/76879");
  expect(card).toHaveAccessibleName("Panel Discussion 9 A View from the Hill 302 (Colorado Convention Center)");
});

test("a plain session shows only its number before the title", () => {
  renderApp(<SessionCard session={sessionSummary({ number: "5", kind: "Session", title: "Global Lightning Observations and Climatology" })} />);
  expect(screen.getByRole("link")).toHaveAccessibleName(/^5 Global Lightning Observations and Climatology /);
});

test("a break shows no kind and no number", () => {
  renderApp(<SessionCard session={sessionSummary({ number: "", kind: "Break", title: "Daily Weather Briefings", room: "207" })} />);
  expect(screen.getByRole("link")).toHaveAccessibleName("Daily Weather Briefings 207 (Colorado Convention Center)");
});
