// @vitest-environment jsdom
import type { AroundAbstract, AroundMatch, TalkSummary } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { SessionTalks } from "@/base/session";
import { SessionPicksView } from "@/improvements/session-picks/session-picks";

import { secondTalk, sessionDetail, talkSummary } from "../fixtures";
import { renderApp } from "../render";

const LABEL = "Our change: come for this talk";
const match = (talk: TalkSummary, score: number, over: Partial<AroundMatch> = {}): AroundMatch => ({ talk, kind: "core", score, reason: `Why ${talk.id} matches.`, tracks: [], ...over });
// Joint session J1 holds J1.2 (493803) and J1.3 (490460). J1.3 holds the session's best match; a talk elsewhere scores
// higher, but is not in this session.
const elsewhere = talkSummary({ id: "487641", sessionId: "76096", number: "5.1" });
const matches = [
  match(talkSummary(), 0.7),
  match(secondTalk(), 0.85, { kind: "unexpected", reason: "Your squall warnings set when freezing rain matters." }),
  match(elsewhere, 0.99),
];
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), abstractTrackIds: [], matches, ...over });
const session = sessionDetail();

const talkLinks = () =>
  screen
    .getAllByRole("link")
    .map((a) => a.getAttribute("href"));
const outlineOf = (label: string) => screen.getByText(label).closest("section")!;
/** The base's list of this session's talks, as HTML, to compare with what our improvements show. */
function amsList(talks = session.talks) {
  const { container, unmount } = renderApp(<SessionTalks talks={talks} />);
  const html = container.innerHTML;
  unmount();
  return html;
}

test("the session's talk with the best match for the abstract is outlined in gold where it sits, with a label to come for it", () => {
  renderApp(<SessionPicksView session={session} around={around()} label={LABEL} />);
  expect(talkLinks()).toEqual(["/talks/493803", "/talks/490460"]);
  expect(within(outlineOf(LABEL)).getByRole("link")).toHaveAttribute("href", "/talks/490460");
  expect(screen.getAllByText(/^Our change/)).toHaveLength(1);
});

test("the marked talk says whether it is a close or an unexpected match, and why, for your abstract", () => {
  renderApp(<SessionPicksView session={session} around={around()} label={LABEL} />);
  const outline = outlineOf(LABEL);
  expect(outline).toHaveTextContent("Unexpected match");
  expect(outline).toHaveTextContent("Why, for your abstract: Your squall warnings set when freezing rain matters.");
});

test("in a poster session, the label says to visit that board first", () => {
  renderApp(<SessionPicksView session={sessionDetail({ kind: "Poster Session", format: "Poster" })} around={around()} label={LABEL} />);
  expect(within(outlineOf("Our change: visit this board first")).getByRole("link")).toHaveAttribute("href", "/talks/490460");
  expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
});

test("a session with no match for the abstract stays exactly as AMS has it", () => {
  const base = amsList();
  const { container } = renderApp(<SessionPicksView session={session} around={around({ matches: [match(elsewhere, 0.99)] })} label={LABEL} />);
  expect(container.innerHTML).toBe(base);
});

test("when the matching API cannot answer, the session stays exactly as AMS has it, with no note", () => {
  const base = amsList();
  const { container } = renderApp(<SessionPicksView session={session} around={around({ matches: null })} label={LABEL} />);
  expect(container.innerHTML).toBe(base);
});

test("with no abstract, the session stays exactly as AMS has it", () => {
  const base = amsList();
  const { container } = renderApp(<SessionPicksView session={session} around={{ abstract: null, abstractTrackIds: [], matches: null }} label={LABEL} />);
  expect(container.innerHTML).toBe(base);
});
