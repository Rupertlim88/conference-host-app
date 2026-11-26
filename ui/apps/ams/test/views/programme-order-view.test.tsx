// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ProgrammeOrderView } from "@/improvements/programme-order";

import { talkSummary, track } from "../fixtures";
import { renderApp } from "../render";

const tracks = [track({ id: "A", title: "Alpha" }), track({ id: "B", title: "Beta" }), track({ id: "C", title: "Gamma" }), track({ id: "D", title: "Delta" })];
const names = () => within(screen.getByRole("list")).getAllByRole("link").map((a) => a.textContent);

test("tracks with more matches for the abstract come first; the rest keep AMS's order", () => {
  renderApp(<ProgrammeOrderView tracks={tracks} around={{ abstract: talkSummary(), matches: [], matchesByTrack: { C: 3, B: 1, D: 1 } }} />);
  expect(names()).toEqual(["Gamma3 related talks", "Beta1 related talk", "Delta1 related talk", "Alpha"]);
  expect(screen.getByText(/Ordered around your abstract: J1.2 - What is a Snow Squall/)).toBeInTheDocument();
});

test("when the matching API cannot answer, AMS's order stays and the page says so", () => {
  renderApp(<ProgrammeOrderView tracks={tracks} around={{ abstract: talkSummary(), matches: null, matchesByTrack: null }} />);
  expect(names()).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
  expect(screen.getByText("The matching API cannot answer right now, so AMS's order stays.")).toBeInTheDocument();
});

test("with no abstract to order around, AMS's order stays", () => {
  renderApp(<ProgrammeOrderView tracks={tracks} around={{ abstract: null, matches: null, matchesByTrack: null }} />);
  expect(names()).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
  expect(screen.getByText("The demo has no abstract to order around yet.")).toBeInTheDocument();
});
