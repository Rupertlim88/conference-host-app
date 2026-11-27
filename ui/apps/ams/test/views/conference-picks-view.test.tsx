// @vitest-environment jsdom
import type { AroundAbstract, AroundMatch } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ConferencePicksView } from "@/improvements/conference-picks/conference-picks";

import { aroundPools, talkSummary, track } from "../fixtures";
import { renderApp } from "../render";

const [alpha, beta, gamma, delta, epsilon] = [
  track({ id: "A", title: "Alpha" }),
  track({ id: "B", title: "Beta" }),
  track({ id: "C", title: "Gamma" }),
  track({ id: "D", title: "Delta" }),
  track({ id: "E", title: "Epsilon" }),
];
const tracks = [alpha!, beta!, gamma!, delta!, epsilon!];
const match = (id: string, number: string, score: number, over: Partial<AroundMatch> = {}): AroundMatch => ({
  talk: talkSummary({ id, number, title: `Talk ${id}`, startsAt: "2027-01-13T21:00:00.000Z" }),
  kind: "core",
  score,
  reason: `Why ${id} matches.`,
  tracks: [],
  ...over,
});
// The backend's pool for each other conference, holding the one talk a conference shows. Delta is the attendee's own
// conference, so it has no pool. Gamma's talk is Z; Beta's is Y, which scores higher.
const pools = aroundPools({
  subConference: [
    { id: "B", matches: [match("Y", "J5.3", 0.9, { kind: "unexpected", reason: "Your smoke heights feed its warnings." })] },
    { id: "C", matches: [match("Z", "11.2", 0.8)] },
  ],
});
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), abstractTrackIds: ["D"], pools, layout: null, ...over });

const LABEL = "Our change: other conferences, ranked for your abstract";
const box = () => screen.getByText(LABEL).closest("section")!;
const lists = () => screen.getAllByRole("list");
const linksIn = (list: HTMLElement) =>
  within(list)
    .getAllByRole("link")
    .map((a) => a.getAttribute("href"));
const restList = () => lists().at(-1)!;
const rest = () => within(restList()).getAllByRole("listitem").map((li) => li.textContent);
/** AMS's list sits below the gold box, outside it. */
function expectRestBelowBox() {
  expect(box()).not.toContainElement(restList());
  expect(box().compareDocumentPosition(restList()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

test("the other conferences holding a match for the abstract come first, in a gold box at the top, the one whose best talk scores higher first", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={around()} label={LABEL} />);
  expect(linksIn(box())).toEqual(["/programs/B", "/talks/Y", "/programs/C", "/talks/Z"]);
  expectRestBelowBox();
});

test("each conference shows the talk its pool holds, and conferences follow that talk's score", () => {
  const listed = aroundPools({
    subConference: [
      { id: "C", matches: [match("X", "3.1", 0.7)] },
      { id: "A", matches: [match("U", "2.2", 0.75)] },
    ],
  });
  renderApp(<ConferencePicksView tracks={tracks} around={around({ pools: listed })} label={LABEL} />);
  expect(linksIn(box())).toEqual(["/programs/A", "/talks/U", "/programs/C", "/talks/X"]);
});

test("a pool for a conference the list does not show is left out", () => {
  const listed = aroundPools({ subConference: [{ id: "Q", matches: [match("Q1", "1.1", 0.9)] }] });
  renderApp(<ConferencePicksView tracks={tracks} around={around({ pools: listed })} label={LABEL} />);
  expect(box().textContent).toBe(LABEL);
});

test("each shows its best talk's number and title, the kind of match, its day and time, and the reason", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={around()} label={LABEL} />);
  const [first, second] = within(box()).getAllByRole("listitem");
  expect(within(first!).getByRole("link", { name: "J5.3 Talk Y" })).toHaveAttribute("href", "/talks/Y");
  expect(first).toHaveTextContent("Unexpected match");
  expect(first).toHaveTextContent("Wed, Jan 13 · 2:00 PM");
  expect(first).toHaveTextContent("Why: Your smoke heights feed its warnings.");
  expect(second).toHaveTextContent("Close match");
  expect(second).toHaveTextContent("Why: Why Z matches.");
});

test("the attendee's own conferences stay in AMS's place, marked as theirs, and the rest follow in AMS's order below the box", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={around()} label={LABEL} />);
  expect(screen.getByRole("heading", { name: "The rest, in AMS's order" })).toBeInTheDocument();
  expect(rest()).toEqual(["Alpha", "Delta Your conference", "Epsilon"]);
});

test("the box names the abstract the conferences were picked for", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={around()} label={LABEL} />);
  expect(within(box()).getByText((_, el) => el?.tagName === "P" && el.textContent === "Picked for your abstract: J1.2 What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us.")).toBeInTheDocument();
});

test("when no other conference holds a match, the box at the top shows empty and AMS's order stays below it", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={around({ pools: aroundPools({ subConference: [] }) })} label={LABEL} />);
  expect(box().textContent).toBe(LABEL);
  expect(lists()).toHaveLength(1);
  expect(rest()).toEqual(["Alpha", "Beta", "Gamma", "Delta Your conference", "Epsilon"]);
  expectRestBelowBox();
});

test("when the matching API cannot answer, the box holds one line saying so, and AMS's order stays below it", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={around({ pools: null })} label={LABEL} />);
  expect(box().textContent).toBe(`${LABEL}The matching API cannot answer right now, so AMS's order stays.`);
  expect(rest()).toEqual(["Alpha", "Beta", "Gamma", "Delta Your conference", "Epsilon"]);
  expectRestBelowBox();
});

test("with no abstract to rank around, the box holds one line saying so, and AMS's order stays below it", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={{ abstract: null, abstractTrackIds: [], pools: null, layout: null }} label={LABEL} />);
  expect(box().textContent).toBe(`${LABEL}The demo has no abstract to order around yet.`);
  expect(rest()).toEqual(["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]);
  expectRestBelowBox();
});
