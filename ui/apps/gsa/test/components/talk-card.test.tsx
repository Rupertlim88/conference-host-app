// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { TalkCard } from "@/components/talk-card";

import { talkSummary } from "../fixtures";
import { renderApp } from "../render";

test("a talk card links to the abstract and reads time, number and title, authors, then room", () => {
  renderApp(<TalkCard talk={talkSummary()} />);
  const card = screen.getByRole("link");
  expect(card).toHaveAttribute("href", "/talks/16121");
  expect(card).toHaveAccessibleName(
    "1:35 PM 173-1 Multi-Objective Optimization with Groundwater Models: Framing Complex Results for Resource Management Decisions Corson-Dosch, Nicholas T [1] CCC, 111",
  );
});

test("a break in a session's list is shown but leads nowhere", () => {
  renderApp(<TalkCard talk={talkSummary({ id: "b1", number: "", kind: "break", title: "Break" })} />);
  expect(screen.getByText("Break")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
