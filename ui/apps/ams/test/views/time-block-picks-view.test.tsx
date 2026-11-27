// @vitest-environment jsdom
import type { AroundAbstract, AroundMatch } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { DayList } from "@/base/calendar";
import { CalendarPicksView } from "@/improvements/time-block-picks/time-block-picks";

import { aroundPools, sessionSummary, talkSummary } from "../fixtures";
import { renderApp } from "../render";

// Real sessions on Tuesday, January 12, 2027. Major Weather Impacts I starts with the panel and the lightning session
// but ends earlier, so AMS shows it under a heading of its own.
const breakfast = sessionSummary({ id: "77355", number: "", kind: "Event", title: "Local Chapter Officers' Breakfast", startsAt: "2027-01-12T14:00:00.000Z", endsAt: "2027-01-12T15:30:00.000Z" });
const weather = sessionSummary({ id: "77136", number: "5", kind: "Session", title: "Major Weather Impacts I", startsAt: "2027-01-12T15:30:00.000Z", endsAt: "2027-01-12T16:45:00.000Z" });
const panel = sessionSummary({ id: "76879", number: "9", kind: "Panel Discussion", title: "A View from the Hill", startsAt: "2027-01-12T15:30:00.000Z", endsAt: "2027-01-12T17:00:00.000Z" });
const lightning = sessionSummary({ id: "76096", number: "5", kind: "Session", title: "Global Lightning Observations and Climatology", startsAt: "2027-01-12T15:30:00.000Z", endsAt: "2027-01-12T17:00:00.000Z" });
const coffee = sessionSummary({ id: "75349", number: "", kind: "Break", title: "Coffee Break", startsAt: "2027-01-12T17:00:00.000Z", endsAt: "2027-01-12T17:45:00.000Z" });
const day = [coffee, panel, lightning, weather, breakfast];

const LABEL = "Our change: recommended around your abstract";
const match = (id: string, sessionId: string, startsAt: string, score: number, kind: AroundMatch["kind"], reason: string): AroundMatch => ({
  talk: talkSummary({ id, sessionId, startsAt: `2027-01-12T${startsAt}:00.000Z` }),
  kind,
  score,
  reason,
  tracks: [],
});
// The matching API's pool for the time block at 8:30 AM, in its order: one talk from each session.
const pools = aroundPools({
  timeBlock: [
    {
      id: "2027-01-12T15:30:00.000Z",
      matches: [
        match("490001", "76096", "15:30", 0.9, "unexpected", "Lightning climatology uses the same records."),
        match("489233", "77136", "16:00", 0.85, "core", "Both count a record year of severe weather."),
      ],
    },
  ],
});
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), abstractTrackIds: [], pools, layout: null, ...over });

const sessionLinks = (root: HTMLElement = document.body) =>
  within(root)
    .getAllByRole("link")
    .map((a) => a.getAttribute("href"));
const headings = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
/** Every gold outline on the page, in page order. */
const outlines = () => screen.getAllByText(LABEL).map((label) => label.closest("section")!);
/** The page without its gold outlines, as HTML: what is left must be AMS's own day. */
function outsideOutlines(container: HTMLElement) {
  const copy = container.cloneNode(true) as HTMLElement;
  for (const label of within(copy).getAllByText(LABEL)) label.closest("section")!.remove();
  return copy.innerHTML;
}
/** The base's list for these sessions, as HTML, to compare with what our improvements show. */
function amsList(sessions = day) {
  const { container, unmount } = renderApp(<DayList sessions={sessions} />);
  const html = container.innerHTML;
  unmount();
  return html;
}

test("every time block opens with its gold box, the block's time as a heading, then its recommendations", () => {
  renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={around()} label={LABEL} />);
  expect(outlines()).toHaveLength(3);
  const picked = outlines()[1]!;
  expect(within(picked).getByRole("heading", { level: 2 })).toHaveTextContent(/^8:30 AM$/);
  expect(sessionLinks(picked)).toEqual(["/sessions/76096", "/sessions/77136"]);
});

test("a block with no recommendation opens with its box empty, and the rest of the block stays as AMS has it", () => {
  renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={around()} label={LABEL} />);
  const [early, , late] = outlines();
  expect(early!.textContent).toBe(`${LABEL}7:00 AM`);
  expect(late!.textContent).toBe(`${LABEL}10:00 AM`);
});

test("the rest of each block follows its box in AMS's order, without the recommended sessions", () => {
  renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={around()} label={LABEL} />);
  expect(sessionLinks()).toEqual(["/sessions/77355", "/sessions/76096", "/sessions/77136", "/sessions/76879", "/sessions/75349"]);
  expect(headings()).toEqual(["7:00 AM", "7:00 AM - 8:30 AM", "8:30 AM", "8:30 AM - 10:00 AM", "10:00 AM", "10:00 AM - 10:45 AM"]);
});

test("each recommendation says whether it is a close or unexpected match, the reason and when its related talk is", () => {
  renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={around()} label={LABEL} />);
  const [first, second] = within(outlines()[1]!).getAllByRole("listitem");
  expect(first).toHaveTextContent("Unexpected match");
  expect(first).toHaveTextContent("Lightning climatology uses the same records.");
  expect(first).toHaveTextContent("Related talk at 8:30 AM");
  expect(second).toHaveTextContent("Close match");
  expect(second).toHaveTextContent("Both count a record year of severe weather.");
  expect(second).toHaveTextContent("Related talk at 9:00 AM");
  expect(outlines()[1]).not.toHaveTextContent(/\d related talks?/);
});

test("a day whose blocks hold no match opens every block with its box empty, and otherwise stays exactly as AMS has it", () => {
  const base = amsList();
  const elsewhere = aroundPools({ timeBlock: [{ id: "2027-01-11T15:30:00.000Z", matches: [match("493803", "77102", "15:45", 0.9, "core", "On another day.")] }] });
  const { container } = renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={around({ pools: elsewhere })} label={LABEL} />);
  expect(outlines().map((o) => o.textContent)).toEqual([`${LABEL}7:00 AM`, `${LABEL}8:30 AM`, `${LABEL}10:00 AM`]);
  expect(outsideOutlines(container)).toBe(base);
});

test("when the matching API cannot answer, every block's box is empty, the day stays as AMS has it, and one gold note says so", () => {
  const base = amsList();
  const { container } = renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={around({ pools: null })} label={LABEL} />);
  expect(outlines().map((o) => o.textContent)).toEqual([
    `${LABEL}The matching API cannot answer right now, so no sessions are recommended around your abstract and the calendar stays as AMS has it.`,
    `${LABEL}7:00 AM`,
    `${LABEL}8:30 AM`,
    `${LABEL}10:00 AM`,
  ]);
  expect(outsideOutlines(container)).toBe(base);
});

test("with no abstract to recommend around, every block's box is empty, the day stays as AMS has it, and one gold note says so", () => {
  const base = amsList();
  const { container } = renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={{ abstract: null, abstractTrackIds: [], pools: null, layout: null }} label={LABEL} />);
  expect(outlines().map((o) => o.textContent)).toEqual([`${LABEL}The demo has no abstract to recommend sessions around yet.`, `${LABEL}7:00 AM`, `${LABEL}8:30 AM`, `${LABEL}10:00 AM`]);
  expect(outsideOutlines(container)).toBe(base);
});

test("a day with no sessions says so", () => {
  renderApp(<CalendarPicksView date="2027-01-12" sessions={[]} around={around()} label={LABEL} />);
  expect(screen.getByText("No sessions on this day.")).toBeInTheDocument();
});

test("with a test set's layout, the day shows the sessions the layout places on it, at their start there, under one gold note", () => {
  // The layout moves the lightning session to 2:00 PM and leaves the others off the day.
  const moved = { ...lightning, startsAt: "2027-01-12T21:00:00.000Z", endsAt: "2027-01-12T22:30:00.000Z" };
  const laidOut = around({ pools: aroundPools({}), layout: [{ session: moved, talks: [] }] });
  renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={laidOut} label={LABEL} />);
  expect(screen.getByText("Our change: sessions and talks sit where the test set lays them out")).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["2:00 PM", "2:00 PM - 3:30 PM"]);
  expect(sessionLinks()).toEqual(["/sessions/76096"]);
});

test("without a layout, there is no note about one", () => {
  renderApp(<CalendarPicksView date="2027-01-12" sessions={day} around={around()} label={LABEL} />);
  expect(screen.queryByText("Our change: sessions and talks sit where the test set lays them out")).not.toBeInTheDocument();
});
