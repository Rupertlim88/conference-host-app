// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { SessionList } from "@/components/session-list";

import { sessionSummary } from "../fixtures";
import { renderApp } from "../render";

test("each row reads start and end time, number and title, then kind and room, and leads to the session", () => {
  renderApp(<SessionList sessions={[sessionSummary()]} />);
  const row = within(screen.getByRole("list")).getByRole("link");
  expect(row).toHaveAttribute("href", "/sessions/96389");
  expect(row).toHaveAccessibleName("1:30 PM 5:30 PM 173: T104. Advances in hydrologic modeling Topical Sessions · CCC, 111");
});

test("a session with no end time, number or room shows what it has", () => {
  renderApp(<SessionList sessions={[sessionSummary({ id: "96808", number: "", kind: "Non-Technical Events", title: "Speaker Ready Room", endsAt: null, room: "" })]} />);
  expect(screen.getByRole("link")).toHaveAccessibleName("1:30 PM Speaker Ready Room Non-Technical Events");
});

test("rows keep the order they are given", () => {
  renderApp(<SessionList sessions={[sessionSummary({ id: "b" }), sessionSummary({ id: "a" })]} />);
  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/sessions/b", "/sessions/a"]);
});
