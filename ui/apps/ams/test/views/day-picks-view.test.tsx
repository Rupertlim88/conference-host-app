// @vitest-environment jsdom
import type { AroundAbstract, AroundMatch } from "@repo/host-contracts";
import { within } from "@testing-library/react";
import { expect, test } from "vitest";

import { DayPicksView } from "@/improvements/day-picks/day-picks";

import { aroundPools, talkSummary, track } from "../fixtures";
import { renderApp } from "../render";

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
// The matching API's pool for Tuesday, January 12, 2027, in its order.
const pools = aroundPools({
  day: [
    {
      id: "2027-01-12",
      matches: [
        match("53", "J5.3", "2027-01-12T16:00:00.000Z", 0.9, { kind: "unexpected", reason: "Your smoke heights feed its warnings.", tracks: [health] }),
        match("486", "Poster 486", "2027-01-12T22:00:00.000Z", 0.8),
      ],
    },
  ],
});
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), abstractTrackIds: [], pools, ...over });
/** What the day's picks show inside the outline the change point draws around them. */
const shown = (date: string, a: AroundAbstract) => renderApp(<DayPicksView date={date} around={a} />).container;

test("the day's best talks for the abstract are listed, in the pool's order, saying they were picked for it", () => {
  const view = shown("2027-01-12", around());
  expect(within(view).getByText("Picked for your abstract, from every event on Tuesday")).toBeInTheDocument();
  expect(within(view).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/talks/53", "/talks/486"]);
});

test("each shows its time, number and title, the kind of match, its conference and the reason", () => {
  const [first, second] = within(shown("2027-01-12", around())).getAllByRole("listitem");
  expect(within(first!).getByRole("link", { name: "J5.3 Talk 53" })).toBeInTheDocument();
  expect(first).toHaveTextContent("9:00 AM");
  expect(first).toHaveTextContent("Unexpected match");
  expect(first).toHaveTextContent("18th Conference on Environment and Health");
  expect(first).toHaveTextContent("Why: Your smoke heights feed its warnings.");
  expect(second).toHaveTextContent("3:00 PM");
  expect(second).toHaveTextContent("Close match");
  expect(second).toHaveTextContent("19th Symposium on Aerosol-Cloud-Climate Interactions");
});

test("a day the matching API lists nothing for shows nothing, so its outline is empty", () => {
  expect(shown("2027-01-13", around()).textContent).toBe("");
});

test("the picks draw no gold outline of their own: the change point draws the one outline", () => {
  for (const a of [around(), around({ pools: null })]) expect(shown("2027-01-12", a).querySelector("section")).toBeNull();
});

test("when the matching API cannot answer, one line says so", () => {
  expect(shown("2027-01-12", around({ pools: null })).textContent).toBe(
    "The matching API cannot answer right now, so no talks are picked for your abstract today.",
  );
});

test("with no abstract, one line says so", () => {
  expect(shown("2027-01-12", { abstract: null, abstractTrackIds: [], pools: null }).textContent).toBe("The demo has no abstract to pick talks for yet.");
});
