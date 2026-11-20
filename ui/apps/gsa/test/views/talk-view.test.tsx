// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { TalkView } from "@/components/views/talk-view";

import { talkDetail } from "../fixtures";
import { renderApp } from "../render";

const slots = { star: null, note: null, related: null };
const section = (name: string) => screen.getByRole("heading", { level: 2, name }).parentElement!;

test("an abstract is titled by its number and title, with its session linked underneath", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^173-1 Multi-Objective Optimization with Groundwater Models/);
  expect(screen.getByRole("link", { name: "T104. Advances in hydrologic modeling" })).toHaveAttribute("href", "/sessions/96389");
});

test("it can be added to the calendar, and shows day, time and room", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();
  expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["Monday, October 12, 2026", "1:35 PM - 1:55 PM", "CCC, 111"]);
});

test("the authors section names the presenter, the author line and each affiliation", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  const authors = section("Authors");
  expect(within(authors).getByText("Nicholas Corson-Dosch")).toBeInTheDocument();
  expect(within(authors).getByText("Corson-Dosch, Nicholas T [1]")).toBeInTheDocument();
  expect(within(authors).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["(1) U.S. Geological Survey, Upper Midwest Water Science Center, Madison, WI, USA"]);
});

test("the abstract keeps its paragraphs, or says none was published", () => {
  const { unmount } = renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(within(section("Abstract")).getAllByText(/./, { selector: "p" }).map((p) => p.textContent)).toEqual([
    "Groundwater management decisions require balancing competing objectives under uncertainty.",
    "We frame the results for managers.",
  ]);
  unmount();
  renderApp(<TalkView talk={talkDetail({ abstract: "" })} {...slots} />);
  expect(screen.getByText("No abstract was published for this presentation.")).toBeInTheDocument();
});

test("the DOI links to doi.org, and the citation follows", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getByRole("link", { name: "10.1130/abs/2026AM-16121" })).toHaveAttribute("href", "https://doi.org/10.1130/abs/2026AM-16121");
  expect(screen.getByText("Geological Society of America Abstracts with Programs. Vol. 58, No. 5, 2026")).toBeInTheDocument();
});

test("a poster names its booth, and an abstract outside a session has no session link or DOI line", () => {
  renderApp(<TalkView talk={talkDetail({ kind: "poster", booth: "F12", session: null, doi: "" })} {...slots} />);
  expect(screen.getByText("Poster F12")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("the star, the note and the related talks sit in Guidebook's order", () => {
  renderApp(<TalkView talk={talkDetail()} star={<button type="button">star</button>} note={<p>note</p>} related={<section aria-label="related" />} />);
  const star = screen.getByRole("button", { name: "star" });
  const note = screen.getByText("note");
  const related = screen.getByRole("region", { name: "related" });
  expect(screen.getByRole("heading", { level: 1 }).compareDocumentPosition(star)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(section("Abstract").compareDocumentPosition(note)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(note.compareDocumentPosition(related)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});
