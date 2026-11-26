// @vitest-environment jsdom
import type { AroundAbstract, AroundMatch } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { ConferencePicksView } from "@/improvements/conference-picks/conference-picks";

import { talkSummary, track } from "../fixtures";
import { renderApp } from "../render";

const [alpha, beta, gamma, delta, epsilon] = [
  track({ id: "A", title: "Alpha" }),
  track({ id: "B", title: "Beta" }),
  track({ id: "C", title: "Gamma" }),
  track({ id: "D", title: "Delta" }),
  track({ id: "E", title: "Epsilon" }),
];
const tracks = [alpha!, beta!, gamma!, delta!, epsilon!];
const match = (id: string, number: string, score: number, inTracks: typeof tracks, over: Partial<AroundMatch> = {}): AroundMatch => ({
  talk: talkSummary({ id, number, title: `Talk ${id}`, startsAt: "2027-01-13T21:00:00.000Z" }),
  kind: "core",
  score,
  reason: `Why ${id} matches.`,
  tracks: inTracks,
  ...over,
});
// Delta is the attendee's own conference. Gamma's best talk is Z; Beta's is Y, which scores higher.
const matches = [
  match("X", "3.1", 0.7, [gamma!]),
  match("Y", "J5.3", 0.9, [beta!], { kind: "unexpected", reason: "Your smoke heights feed its warnings." }),
  match("Z", "11.2", 0.8, [gamma!]),
  match("W", "4.4", 0.95, [delta!]),
  match("V", "J5.1", 0.6, [beta!, delta!]),
];
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), abstractTrackIds: ["D"], matches, ...over });

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
  renderApp(<ConferencePicksView tracks={tracks} around={around({ matches: [matches[3]!] })} label={LABEL} />);
  expect(box().textContent).toBe(LABEL);
  expect(lists()).toHaveLength(1);
  expect(rest()).toEqual(["Alpha", "Beta", "Gamma", "Delta Your conference", "Epsilon"]);
  expectRestBelowBox();
});

test("when the matching API cannot answer, the box holds one line saying so, and AMS's order stays below it", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={around({ matches: null })} label={LABEL} />);
  expect(box().textContent).toBe(`${LABEL}The matching API cannot answer right now, so AMS's order stays.`);
  expect(rest()).toEqual(["Alpha", "Beta", "Gamma", "Delta Your conference", "Epsilon"]);
  expectRestBelowBox();
});

test("with no abstract to rank around, the box holds one line saying so, and AMS's order stays below it", () => {
  renderApp(<ConferencePicksView tracks={tracks} around={{ abstract: null, abstractTrackIds: [], matches: null }} label={LABEL} />);
  expect(box().textContent).toBe(`${LABEL}The demo has no abstract to order around yet.`);
  expect(rest()).toEqual(["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]);
  expectRestBelowBox();
});
