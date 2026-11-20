// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { SessionView } from "@/components/views/session-view";

import { sessionDetail } from "../fixtures";
import { renderApp } from "../render";

const slots = { star: null, note: null };
const section = (name: string) => screen.getByRole("heading", { level: 2, name }).parentElement!;

test("a session is titled by kind and number, dash, title, under its abstract types", () => {
  renderApp(<SessionView session={sessionDetail()} {...slots} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Topical Sessions 173 - T104. Advances in hydrologic modeling");
  expect(screen.getByRole("heading", { level: 1 }).previousElementSibling).toHaveTextContent("Discipline > Hydrogeology");
});

test("a plain session reads Session and its number", () => {
  renderApp(<SessionView session={sessionDetail({ kind: "Session", number: "12", title: "Open Session" })} {...slots} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Session 12 - Open Session");
});

test("it can be added to the calendar, and shows day, time and room", () => {
  renderApp(<SessionView session={sessionDetail()} {...slots} />);
  expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();
  expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["Monday, October 12, 2026", "1:30 PM - 5:30 PM", "CCC, 111"]);
});

test("description and organizers show under their headings", () => {
  renderApp(<SessionView session={sessionDetail()} {...slots} />);
  expect(within(section("Description")).getByText(/^Recent advances in hydrologic modeling/)).toBeInTheDocument();
  expect(within(section("Organizers")).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Andrew Leaf, Anna Fehling"]);
});

test("the presentations are listed in order, after the note box", () => {
  renderApp(<SessionView session={sessionDetail()} star={null} note={<p>note</p>} />);
  expect(within(section("Presentations")).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/talks/16121", "/talks/16000"]);
  expect(screen.getByText("note").compareDocumentPosition(section("Presentations"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

test("a session with no presentations says so, and its abstract types are linked", () => {
  renderApp(<SessionView session={sessionDetail({ talks: [] })} {...slots} />);
  expect(within(section("Presentations")).getByText("No presentations listed.")).toBeInTheDocument();
  expect(within(section("View Related")).getByRole("link", { name: "Discipline > Hydrogeology" })).toHaveAttribute("href", "/programs/discipline-hydrogeology");
});
