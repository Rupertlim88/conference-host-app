// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { NotesView } from "@/components/views/notes-view";

import { note } from "../fixtures";
import { renderApp } from "../render";

test("with no notes, Notes says how to add one", () => {
  renderApp(<NotesView notes={[]} />);
  expect(screen.getByRole("heading", { level: 1, name: "Notes" })).toBeInTheDocument();
  expect(screen.getByText("No notes yet. Add one from any session or abstract.")).toBeInTheDocument();
});

test("each note shows what it is on and leads back there", () => {
  renderApp(<NotesView notes={[note(), note({ targetKind: "session", targetId: "96389", title: "T104. Advances in hydrologic modeling", body: "Room changed?" })]} />);
  const links = within(screen.getByRole("list")).getAllByRole("link");
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["/talks/16121", "/sessions/96389"]);
  expect(links[0]).toHaveAccessibleName(/^Multi-Objective Optimization .* Ask about the emulators\.$/);
  expect(screen.queryByText(/^No notes yet/)).not.toBeInTheDocument();
});
