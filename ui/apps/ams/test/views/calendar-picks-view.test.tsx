// @vitest-environment jsdom
import type { AroundAbstract, RelatedMatch } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { DayList } from "@/base/calendar";
import { CalendarPicksView } from "@/improvements/calendar-picks";

import { sessionSummary, talkSummary } from "../fixtures";
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
const match = (id: string, sessionId: string, startsAt: string, score: number, kind: RelatedMatch["kind"], reason: string): RelatedMatch => ({
  talk: talkSummary({ id, sessionId, startsAt: `2027-01-12T${startsAt}:00.000Z` }),
  kind,
  score,
  reason,
});
const matches = [
  match("489412", "77136", "15:45", 0.7, "core", "Both review a year of hurricanes."),
  match("490001", "76096", "15:30", 0.9, "unexpected", "Lightning climatology uses the same records."),
  match("489233", "77136", "16:00", 0.85, "core", "Both count a record year of severe weather."),
];
const around = (over: Partial<AroundAbstract> = {}): AroundAbstract => ({ abstract: talkSummary(), matches, matchesByTrack: {}, ...over });

const sessionLinks = (root: HTMLElement = document.body) =>
  within(root)
    .getAllByRole("link")
    .map((a) => a.getAttribute("href"));
const headings = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
/** The gold outline whose label reads exactly this, however the label's words are split into elements. */
const outlineOf = (label: string) =>
  screen.getByText((_, el) => el?.textContent === label && ![...el.children].some((child) => child.textContent === label)).closest("section")!;
/** The base's list for these sessions, as HTML, to compare with what our improvements show. */
function amsList(sessions = day) {
  const { container, unmount } = renderApp(<DayList sessions={sessions} />);
  const html = container.innerHTML;
  unmount();
  return html;
}

test("a time block with recommendations starts with them in a gold outline labelled with its time", () => {
  renderApp(<CalendarPicksView sessions={day} around={around()} label={LABEL} />);
  const outline = outlineOf(`${LABEL} · 8:30 AM`);
  expect(sessionLinks(outline)).toEqual(["/sessions/77136", "/sessions/76096"]);
  expect(screen.getAllByText(/^Our change/)).toHaveLength(1);
});

test("the rest of the block follows in AMS's order without them, and other blocks stay as AMS has them", () => {
  renderApp(<CalendarPicksView sessions={day} around={around()} label={LABEL} />);
  expect(sessionLinks()).toEqual(["/sessions/77355", "/sessions/77136", "/sessions/76096", "/sessions/76879", "/sessions/75349"]);
  expect(headings()).toEqual(["7:00 AM - 8:30 AM", "8:30 AM - 10:00 AM", "10:00 AM - 10:45 AM"]);
});

test("each recommendation says whether it is a close or unexpected match, its related talks, the reason and when the first is", () => {
  renderApp(<CalendarPicksView sessions={day} around={around()} label={LABEL} />);
  const [first, second] = within(outlineOf(`${LABEL} · 8:30 AM`)).getAllByRole("listitem");
  expect(first).toHaveTextContent("Close match");
  expect(first).toHaveTextContent("2 related talks");
  expect(first).toHaveTextContent("Both count a record year of severe weather.");
  expect(first).toHaveTextContent("First related talk at 8:45 AM");
  expect(second).toHaveTextContent("Unexpected match");
  expect(second).toHaveTextContent("1 related talk");
  expect(second).toHaveTextContent("Lightning climatology uses the same records.");
  expect(second).toHaveTextContent("First related talk at 8:30 AM");
});

test("a day whose blocks hold no match stays exactly as AMS has it", () => {
  const base = amsList();
  const elsewhere = [match("493803", "77102", "15:45", 0.9, "core", "On another day.")];
  const { container } = renderApp(<CalendarPicksView sessions={day} around={around({ matches: elsewhere })} label={LABEL} />);
  expect(container.innerHTML).toBe(base);
});

test("when the matching API cannot answer, the calendar stays as AMS has it, and one gold note says so", () => {
  const base = amsList();
  const { container } = renderApp(<CalendarPicksView sessions={day} around={around({ matches: null, matchesByTrack: null })} label={LABEL} />);
  expect(within(outlineOf(LABEL)).getByText("The matching API cannot answer right now, so no sessions are recommended around your abstract and the calendar stays as AMS has it.")).toBeInTheDocument();
  expect(screen.getAllByText(/^Our change/)).toHaveLength(1);
  expect(container.innerHTML).toContain(base);
});

test("with no abstract to recommend around, the calendar stays as AMS has it, and one gold note says so", () => {
  const base = amsList();
  const { container } = renderApp(<CalendarPicksView sessions={day} around={{ abstract: null, matches: null, matchesByTrack: null }} label={LABEL} />);
  expect(within(outlineOf(LABEL)).getByText("The demo has no abstract to recommend sessions around yet.")).toBeInTheDocument();
  expect(container.innerHTML).toContain(base);
});

test("a day with no sessions says so", () => {
  renderApp(<CalendarPicksView sessions={[]} around={around()} label={LABEL} />);
  expect(screen.getByText("No sessions on this day.")).toBeInTheDocument();
});
