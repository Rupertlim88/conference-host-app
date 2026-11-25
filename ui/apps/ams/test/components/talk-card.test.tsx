// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { TalkCard } from "@/features/cards";

import { talkSummary } from "../fixtures";
import { renderApp } from "../render";

test("a talk card links to the talk and reads time, number and title, authors, then place", () => {
  renderApp(<TalkCard talk={talkSummary()} />);
  const card = screen.getByRole("link");
  expect(card).toHaveAttribute("href", "/talks/493803");
  expect(card).toHaveAccessibleName(
    "8:45 AM J1.2 What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us. Andrew A. Rosenow, CIWRO - Cooperative Institute for Severe and High Impact Weather Research and Operations, Norman, OK 403 (Colorado Convention Center)",
  );
});

test("a talk with no number or authors shows its title alone", () => {
  renderApp(<TalkCard talk={talkSummary({ number: "", authorLine: "", presentingAuthor: "", room: "", building: "" })} />);
  expect(screen.getByRole("link")).toHaveAccessibleName("8:45 AM What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us.");
});

test("a break in a session's list is shown but leads nowhere", () => {
  renderApp(<TalkCard talk={talkSummary({ id: "b1", number: "", kind: "break", title: "Coffee Break" })} />);
  expect(screen.getByText("Coffee Break")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
