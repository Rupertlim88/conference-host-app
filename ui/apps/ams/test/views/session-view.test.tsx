// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { SessionView } from "@/base/session";

import { sessionDetail } from "../fixtures";
import { renderApp } from "../render";

const section = (name: string) => screen.getByRole("heading", { level: 2, name }).parentElement!;

test("the title reads kind and number, dash, title, under the conferences the session belongs to", () => {
  renderApp(<SessionView session={sessionDetail()} star={null} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Joint Session J1 - Decision Support I: Winter Weather/);
  expect(screen.getByText("Fourth Symposium on the Future of Weather, Forecasting, and Practice and 17th Conference on Transition of Research to Operations [17R2O]")).toBeInTheDocument();
});

test("a plain session reads Session and its number, and a break has its title only", () => {
  const { unmount } = renderApp(<SessionView session={sessionDetail({ kind: "Session", number: "5", title: "Global Lightning Observations and Climatology" })} star={null} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Session 5 - Global Lightning Observations and Climatology");
  unmount();
  renderApp(<SessionView session={sessionDetail({ kind: "Break", number: "", title: "Coffee Break" })} star={null} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Coffee Break$/);
});

test("under the title: the star, then day, time and place", () => {
  renderApp(<SessionView session={sessionDetail()} star={<button type="button">star</button>} />);
  expect(screen.getByRole("heading", { level: 1 }).compareDocumentPosition(screen.getByRole("button", { name: "star" }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual([
    "Monday, January 11, 2027",
    "8:30 AM - 10:00 AM",
    "403 (Colorado Convention Center)",
  ]);
});

test("each organizer is listed with their role", () => {
  // Session J2 (77105) lists two.
  const chairs = "Chair: Matthew Wilson, NSF NCAR, Boulder, CO; CoChair: Diana Rose Jesberg, PSL, NOAA, Lakewood, CO";
  renderApp(<SessionView session={sessionDetail({ chairs })} star={null} />);
  expect(within(section("Organizers")).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Chair: Matthew Wilson, NSF NCAR, Boulder, CO",
    "CoChair: Diana Rose Jesberg, PSL, NOAA, Lakewood, CO",
  ]);
});

test("a description shows under its heading, and none means no section", () => {
  const { unmount } = renderApp(<SessionView session={sessionDetail({ description: "A session on winter hazards." })} star={null} />);
  expect(within(section("Description")).getByText("A session on winter hazards.")).toBeInTheDocument();
  unmount();
  renderApp(<SessionView session={sessionDetail({ chairs: "" })} star={null} />);
  expect(screen.queryByRole("heading", { name: "Description" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Organizers" })).not.toBeInTheDocument();
});

test("the presentations are listed in order, each linking to its talk", () => {
  renderApp(<SessionView session={sessionDetail()} star={null} />);
  expect(within(section("Presentations")).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/talks/493803", "/talks/490460"]);
});

test("a session with no presentations says so", () => {
  renderApp(<SessionView session={sessionDetail({ talks: [] })} star={null} />);
  expect(within(section("Presentations")).getByText("No presentations listed.")).toBeInTheDocument();
});

test("View Related links to each conference the session belongs to", () => {
  renderApp(<SessionView session={sessionDetail()} star={null} />);
  const links = within(section("View Related")).getAllByRole("link");
  expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Fourth Symposium on the Future of Weather, Forecasting, and Practice", "/programs/1968"],
    ["17th Conference on Transition of Research to Operations [17R2O]", "/programs/1951"],
  ]);
});
