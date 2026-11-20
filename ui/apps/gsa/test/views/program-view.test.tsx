// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ProgramView } from "@/components/views/program-view";

import { sessionSummary, trackDetail } from "../fixtures";
import { renderApp } from "../render";

test("a programme is titled by its conference, with its session count above", () => {
  renderApp(<ProgramView track={trackDetail()} />);
  expect(screen.getByRole("heading", { level: 1, name: "Discipline > Hydrogeology" })).toBeInTheDocument();
  expect(screen.getByText("1 session")).toBeInTheDocument();
});

test("its sessions are listed under the day they start, in meeting time", () => {
  const sat = sessionSummary({ id: "96265", startsAt: "2026-10-12T14:00:00.000Z" });
  const sun = sessionSummary({ id: "96368", startsAt: "2026-10-13T14:00:00.000Z" });
  renderApp(<ProgramView track={trackDetail({ sessions: [sat, sun] })} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Monday, October 12, 2026", "Tuesday, October 13, 2026"]);
  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/sessions/96265", "/sessions/96368"]);
  expect(screen.getByText("2 sessions")).toBeInTheDocument();
});

test("a programme with no sessions says so", () => {
  renderApp(<ProgramView track={trackDetail({ sessions: [] })} />);
  expect(screen.getByText("No sessions")).toBeInTheDocument();
});
