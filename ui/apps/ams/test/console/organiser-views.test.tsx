// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { OrganiserPapersView } from "@/consoles/organiser-papers";
import { OrganiserPaperView } from "@/consoles/organiser-papers";
import { OrganiserSessionView } from "@/consoles/organiser-sessions";
import { OrganiserSessionsView } from "@/consoles/organiser-sessions";

import { organiserSession, organiserSessionDetail, organiserTalk, sessionList, talkList } from "../fixtures";
import { renderApp } from "../render";

const rows = () => screen.getAllByRole("row").slice(1);
const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((c) => c.textContent);

describe("the papers list", () => {
  test("has a search box and a status filter that keep what was asked", () => {
    renderApp(<OrganiserPapersView list={talkList()} q="snow" status="withdrawn" />);
    expect(screen.getByRole("heading", { level: 1, name: "Papers" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search papers" })).toHaveValue("snow");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("withdrawn");
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  test("shows one row a paper: number, title, presenter, session, time in meeting time, status", () => {
    renderApp(
      <OrganiserPapersView
        list={talkList([organiserTalk(), organiserTalk({ id: "490460", number: "J1.3", withdrawn: true }), organiserTalk({ id: "485830", number: "J1.4", change: "moved" })])}
        q=""
        status="all"
      />,
    );
    expect(screen.getByText("3 papers")).toBeInTheDocument();
    expect(within(screen.getAllByRole("row")[0]!).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Number",
      "Title",
      "Presenter",
      "Session",
      "Time (Mountain)",
      "Status",
    ]);
    expect(cells(rows()[0]!)).toEqual([
      "J1.2",
      "What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us.",
      "Andrew A. Rosenow",
      "J1",
      "Mon, Jan 11, 8:45 AM - 9:00 AM",
      "Scheduled",
    ]);
    expect(within(rows()[0]!).getByRole("link", { name: /Snow Squall/ })).toHaveAttribute("href", "/organiser/talks/493803");
    expect(cells(rows()[1]!).at(-1)).toBe("Withdrawn");
    expect(cells(rows()[2]!).at(-1)).toBe("Moved");
  });

  test("says when nothing matches", () => {
    renderApp(<OrganiserPapersView list={talkList([])} q="zzz" status="all" />);
    expect(screen.getByText("No papers match.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("pages 50 at a time, keeping the search in each page's address", () => {
    renderApp(<OrganiserPapersView list={talkList([organiserTalk()], { total: 120, page: 2 })} q="snow" status="all" />);
    const pages = screen.getByRole("navigation", { name: "Pages" });
    expect(within(pages).getByText("Page 2 of 3")).toBeInTheDocument();
    expect(within(pages).getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "/organiser?q=snow&status=all&page=1");
    expect(within(pages).getByRole("link", { name: "Next page" })).toHaveAttribute("href", "/organiser?q=snow&status=all&page=3");
  });
});

describe("a paper", () => {
  const move = (s: { number: string }) => <button type="button">{`Move to ${s.number}`}</button>;

  test("shows its session, time, room and status, with its withdraw control", () => {
    renderApp(
      <OrganiserPaperView talk={organiserTalk()} sessionQuery="" sessionResults={null} withdraw={<button type="button">Withdraw paper</button>} move={move} />,
    );
    expect(screen.getByText("Paper J1.2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^What is a Snow Squall\?/);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      "Scheduled",
      "Andrew A. Rosenow",
      `J1 - ${organiserTalk().sessionTitle}`,
      "Mon, Jan 11, 8:45 AM - 9:00 AM",
      "403 (Colorado Convention Center)",
    ]);
    expect(screen.getByRole("link", { name: /^J1 - / })).toHaveAttribute("href", "/organiser/sessions/77102");
    expect(screen.getByRole("button", { name: "Withdraw paper" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View in the attendee app" })).toHaveAttribute("href", "/talks/493803");
  });

  test("a withdrawn paper has no attendee page to view", () => {
    renderApp(<OrganiserPaperView talk={organiserTalk({ withdrawn: true })} sessionQuery="" sessionResults={null} withdraw={null} move={move} />);
    expect(screen.getAllByRole("definition")[0]).toHaveTextContent("Withdrawn");
    expect(screen.queryByRole("link", { name: "View in the attendee app" })).not.toBeInTheDocument();
  });

  test("finds sessions to move to, each with its move button, except the paper's own", () => {
    const results = sessionList([organiserSession(), organiserSession({ id: "76231", number: "5", title: "Wind Energy Forecasting" })]);
    renderApp(<OrganiserPaperView talk={organiserTalk()} sessionQuery="Wind" sessionResults={results} withdraw={null} move={move} />);
    const section = screen.getByRole("heading", { level: 2, name: "Move to another session" }).parentElement!;
    expect(within(section).getByRole("searchbox", { name: "Find a session" })).toHaveValue("Wind");
    const items = within(section).getAllByRole("listitem");
    expect(within(items[0]!).getByText("This paper's session")).toBeInTheDocument();
    expect(within(items[0]!).queryByRole("button")).not.toBeInTheDocument();
    expect(within(items[1]!).getByRole("button", { name: "Move to 5" })).toBeInTheDocument();
  });

  test("says when no session matches", () => {
    renderApp(<OrganiserPaperView talk={organiserTalk()} sessionQuery="zzz" sessionResults={sessionList([])} withdraw={null} move={move} />);
    expect(screen.getByText("No sessions match.")).toBeInTheDocument();
  });
});

describe("the sessions list", () => {
  test("shows each session's number, title, time, room, papers and whether it changed", () => {
    renderApp(<OrganiserSessionsView list={sessionList([organiserSession(), organiserSession({ id: "76231", number: "5", changed: true, talks: 6 })])} q="" />);
    expect(screen.getByRole("heading", { level: 1, name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search sessions" })).toHaveValue("");
    expect(cells(rows()[0]!)).toEqual(["J1", organiserSession().title, "Mon, Jan 11, 8:30 AM - 10:00 AM", "403", "6", "Published"]);
    expect(cells(rows()[1]!).at(-1)).toBe("Changed");
    expect(within(rows()[0]!).getByRole("link", { name: organiserSession().title })).toHaveAttribute("href", "/organiser/sessions/77102");
  });
});

describe("a session", () => {
  test("shows its time and room, the form slot, and every paper in it with its status", () => {
    renderApp(<OrganiserSessionView session={organiserSessionDetail({ changed: true })} form={<form aria-label="time form" />} />);
    expect(screen.getByText("Session J1")).toBeInTheDocument();
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      "Changed",
      "Mon, Jan 11, 8:30 AM - 10:00 AM",
      "403 (Colorado Convention Center)",
    ]);
    expect(screen.getByRole("form", { name: "time form" })).toBeInTheDocument();
    const papers = screen.getByRole("heading", { level: 2, name: "Papers in this session" }).parentElement!;
    expect(within(papers).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0]!.textContent)).toEqual(["J1.2", "J1.3"]);
    expect(within(papers).getAllByRole("row")[2]).toHaveTextContent("Withdrawn");
    expect(screen.getByRole("link", { name: "View in the attendee app" })).toHaveAttribute("href", "/sessions/77102");
  });
});
