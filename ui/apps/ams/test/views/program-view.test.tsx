// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ProgramView } from "@/features/programmes";

import { sessionSummary, trackDetail } from "../fixtures";
import { renderApp } from "../render";

test("a programme is titled by its conference, with its session count above", () => {
  renderApp(<ProgramView track={trackDetail()} />);
  expect(screen.getByRole("heading", { level: 1, name: "Fourth Symposium on the Future of Weather, Forecasting, and Practice" })).toBeInTheDocument();
  expect(screen.getByText("1 session")).toBeInTheDocument();
});

test("its sessions are listed under the day they start, in meeting time", () => {
  const sat = sessionSummary({ id: "77627", startsAt: "2027-01-09T16:00:00.000Z" });
  const sun = sessionSummary({ id: "77628", startsAt: "2027-01-10T16:00:00.000Z" });
  renderApp(<ProgramView track={trackDetail({ sessions: [sat, sun] })} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Saturday, January 9, 2027", "Sunday, January 10, 2027"]);
  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/sessions/77627", "/sessions/77628"]);
  expect(screen.getByText("2 sessions")).toBeInTheDocument();
});

test("a programme with no sessions says so", () => {
  renderApp(<ProgramView track={trackDetail({ sessions: [] })} />);
  expect(screen.getByText("No sessions")).toBeInTheDocument();
});
