// @vitest-environment jsdom
import type { AroundAbstract, AroundMatch } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { DayPicksView } from "@/improvements/day-picks/day-picks";

import { talkSummary, track } from "../fixtures";
import { renderApp } from "../render";

const LABEL = "Our change: your best talks today";
const health = track({ id: "1958", title: "18th Conference on Environment and Health" });
const aerosol = track({ id: "1934", title: "19th Symposium on Aerosol-Cloud-Climate Interactions" });
const match = (id: string, number: string, startsAt: string, score: number, over: Partial<AroundMatch> = {}): AroundMatch => ({
  talk: talkSummary({ id, sessionId: `S${id}`, number, title: `Talk ${id}`, startsAt }),
  kind: "core",
  score,
  reason: `Why ${id} matches.`,
  tracks: [aerosol],
  ...over,
});
// Tuesday, January 12, 2027, in Denver.
const matches = [
  match("486", "Poster 486", "2027-01-12T22:00:00.000Z", 0.8),
  match("53", "J5.3", "2027-01-12T16:00:00.000Z", 0.9, { kind: "unexpected", reason: "Your smoke heights feed its warnings.", tracks: [health] }),
];
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), abstractTrackIds: [], matches, ...over });
const outline = () => screen.getByText(LABEL).closest("section")!;

test("the day's best talks for the abstract sit in a gold outline saying they were picked for it", () => {
  renderApp(<DayPicksView date="2027-01-12" around={around()} label={LABEL} />);
  expect(within(outline()).getByText("Picked for your abstract, from every event on Tuesday")).toBeInTheDocument();
  expect(within(outline()).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/talks/53", "/talks/486"]);
});

test("each shows its time, number and title, the kind of match, its conference and the reason", () => {
  renderApp(<DayPicksView date="2027-01-12" around={around()} label={LABEL} />);
  const [first, second] = within(outline()).getAllByRole("listitem");
  expect(within(first!).getByRole("link", { name: "J5.3 Talk 53" })).toBeInTheDocument();
  expect(first).toHaveTextContent("9:00 AM");
  expect(first).toHaveTextContent("Unexpected match");
  expect(first).toHaveTextContent("18th Conference on Environment and Health");
  expect(first).toHaveTextContent("Why: Your smoke heights feed its warnings.");
  expect(second).toHaveTextContent("3:00 PM");
  expect(second).toHaveTextContent("Close match");
  expect(second).toHaveTextContent("19th Symposium on Aerosol-Cloud-Climate Interactions");
});

test("a day with none of the abstract's matches shows the box empty", () => {
  renderApp(<DayPicksView date="2027-01-13" around={around()} label={LABEL} />);
  expect(outline().textContent).toBe(LABEL);
});

test("when the matching API cannot answer, one line in the outline says so", () => {
  renderApp(<DayPicksView date="2027-01-12" around={around({ matches: null })} label={LABEL} />);
  expect(outline()).toHaveTextContent(`${LABEL}The matching API cannot answer right now, so no talks are picked for your abstract today.`);
});

test("with no abstract, one line in the outline says so", () => {
  renderApp(<DayPicksView date="2027-01-12" around={{ abstract: null, abstractTrackIds: [], matches: null }} label={LABEL} />);
  expect(outline()).toHaveTextContent(`${LABEL}The demo has no abstract to pick talks for yet.`);
});
