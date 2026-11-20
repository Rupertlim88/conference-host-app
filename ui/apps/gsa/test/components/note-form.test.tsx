// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { NoteForm } from "@/components/note-form";

import { renderApp } from "../render";

test("the note box shows the saved note under its label", () => {
  renderApp(<NoteForm saved="Ask about the emulators." saving={false} onSave={async () => {}} />);
  const box = screen.getByRole("textbox", { name: "My note" });
  expect(box).toHaveValue("Ask about the emulators.");
  expect(box).toHaveAttribute("placeholder", "Write a note");
});

test("saving sends what was typed, then says Saved until the note changes again", async () => {
  const sent: string[] = [];
  renderApp(<NoteForm saved="" saving={false} onSave={async (body) => void sent.push(body)} />);
  fireEvent.change(screen.getByRole("textbox", { name: "My note" }), { target: { value: "Ask about the emulators." } });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  expect(sent).toEqual(["Ask about the emulators."]);
  fireEvent.change(screen.getByRole("textbox", { name: "My note" }), { target: { value: "Ask about the emulators and wells." } });
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("while a note saves, it cannot be saved again", () => {
  renderApp(<NoteForm saved="" saving onSave={async () => {}} />);
  expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
});

test("a note is limited to 5,000 characters", () => {
  renderApp(<NoteForm saved="" saving={false} onSave={async () => {}} />);
  expect(screen.getByRole("textbox", { name: "My note" })).toHaveAttribute("maxLength", "5000");
});

test("after saving, the box keeps the note that was saved", async () => {
  renderApp(<NoteForm saved="" saving={false} onSave={async () => {}} />);
  fireEvent.change(screen.getByRole("textbox", { name: "My note" }), { target: { value: "Ask about the emulators." } });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));
  await screen.findByRole("status");
  expect(screen.getByRole("textbox", { name: "My note" })).toHaveValue("Ask about the emulators.");
});

test("a save that fails says the note was not saved, and keeps what was typed", async () => {
  renderApp(
    <NoteForm
      saved=""
      saving={false}
      onSave={async () => {
        throw new Error("Sign in to see the programme.");
      }}
    />,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "My note" }), { target: { value: "Ask about the emulators." } });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Your note was not saved. Please try again.");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "My note" })).toHaveValue("Ask about the emulators.");
});
