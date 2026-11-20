// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SessionCard } from "@/components/session-card";

import { sessionSummary } from "../fixtures";
import { renderApp } from "../render";

test("a session card links to its session and reads label, title, then place", () => {
  renderApp(<SessionCard session={sessionSummary({ id: "96265", number: "109", title: "T12. Subsurface Characterization", room: "CCC, 105" })} />);
  const card = screen.getByRole("link");
  expect(card).toHaveAttribute("href", "/sessions/96265");
  expect(card).toHaveAccessibleName("Topical Sessions 109 T12. Subsurface Characterization CCC, 105");
});

test("a non-technical event with no number shows its kind before the title", () => {
  renderApp(<SessionCard session={sessionSummary({ number: "", kind: "Non-Technical Events", title: "Speaker Ready Room", room: "CCC, 212" })} />);
  expect(screen.getByRole("link")).toHaveAccessibleName("Non-Technical Events Speaker Ready Room CCC, 212");
});
