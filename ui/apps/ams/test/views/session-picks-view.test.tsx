// @vitest-environment jsdom
import type { AroundAbstract, AroundMatch, TalkSummary } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { SessionTalks } from "@/base/session";
import { SessionPicksView } from "@/improvements/session-picks/session-picks";

import { aroundPools, secondTalk, sessionDetail, talkSummary } from "../fixtures";
import { renderApp } from "../render";

const LABEL = "Our change: come for this talk";
const match = (talk: TalkSummary, score: number, over: Partial<AroundMatch> = {}): AroundMatch => ({ talk, kind: "core", score, reason: `Why ${talk.id} matches.`, tracks: [], ...over });
// Joint session J1 (77102) holds J1.2 (493803) and J1.3 (490460). The matching API's pool for J1 lists J1.3 first; a
// talk in another session's pool scores higher, but is not in this session.
const elsewhere = talkSummary({ id: "487641", sessionId: "76096", number: "5.1" });
const pools = aroundPools({
  session: [
    { id: "76096", matches: [match(elsewhere, 0.99)] },
    { id: "77102", matches: [match(secondTalk(), 0.85, { kind: "unexpected", reason: "Your squall warnings set when freezing rain matters." }), match(talkSummary(), 0.7)] },
  ],
});
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), abstractTrackIds: [], pools, ...over });
const session = sessionDetail();

const talkLinks = () =>
  screen
    .getAllByRole("link")
    .map((a) => a.getAttribute("href"));
const outlineOf = (label: string) => screen.getByText(label).closest("section")!;
/** The page without its gold outline, as HTML: what is left must be AMS's own list. */
function outsideOutline(container: HTMLElement, label = LABEL) {
  const copy = container.cloneNode(true) as HTMLElement;
  within(copy).getByText(label).closest("section")!.remove();
  return copy.innerHTML;
}
/** The base's list of this session's talks, as HTML, to compare with what our improvements show. */
function amsList(talks = session.talks) {
  const { container, unmount } = renderApp(<SessionTalks talks={talks} />);
  const html = container.innerHTML;
  unmount();
  return html;
}

test("the first talk the matching API lists in the session's pool is outlined in gold where it sits, with a label to come for it", () => {
  renderApp(<SessionPicksView session={session} around={around()} label={LABEL} />);
  expect(talkLinks()).toEqual(["/talks/493803", "/talks/490460"]);
  expect(within(outlineOf(LABEL)).getByRole("link")).toHaveAttribute("href", "/talks/490460");
  expect(screen.getAllByText(/^Our change/)).toHaveLength(1);
});

test("a talk the pool lists that the session no longer shows is passed over for the next it lists", () => {
  const moved = aroundPools({ session: [{ id: "77102", matches: [match(elsewhere, 0.99), match(secondTalk(), 0.85)] }] });
  renderApp(<SessionPicksView session={session} around={around({ pools: moved })} label={LABEL} />);
  expect(within(outlineOf(LABEL)).getByRole("link")).toHaveAttribute("href", "/talks/490460");
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

test("a session the matching API lists no pool for opens its talks with an empty box to come for a talk, and its talks stay as AMS has them", () => {
  const base = amsList();
  const { container } = renderApp(<SessionPicksView session={session} around={around({ pools: aroundPools({ session: [pools.session[0]!] }) })} label={LABEL} />);
  expect(outlineOf(LABEL).textContent).toBe(LABEL);
  expect(container.firstElementChild).toBe(outlineOf(LABEL));
  expect(outsideOutline(container)).toBe(base);
});

test("a poster session with no match opens its talks with an empty box to visit a board first", () => {
  const poster = sessionDetail({ kind: "Poster Session", format: "Poster" });
  const base = amsList(poster.talks);
  const { container } = renderApp(<SessionPicksView session={poster} around={around({ pools: aroundPools({ session: [pools.session[0]!] }) })} label={LABEL} />);
  expect(outlineOf("Our change: visit this board first").textContent).toBe("Our change: visit this board first");
  expect(outsideOutline(container, "Our change: visit this board first")).toBe(base);
});

test("when the matching API cannot answer, the session shows the same empty box, with no note", () => {
  const base = amsList();
  const { container } = renderApp(<SessionPicksView session={session} around={around({ pools: null })} label={LABEL} />);
  expect(outlineOf(LABEL).textContent).toBe(LABEL);
  expect(outsideOutline(container)).toBe(base);
});

test("with no abstract, the session shows the same empty box", () => {
  const base = amsList();
  const { container } = renderApp(<SessionPicksView session={session} around={{ abstract: null, abstractTrackIds: [], pools: null }} label={LABEL} />);
  expect(outlineOf(LABEL).textContent).toBe(LABEL);
  expect(outsideOutline(container)).toBe(base);
});
