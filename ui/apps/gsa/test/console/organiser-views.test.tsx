// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { OrganiserSubmissionsView } from "@/components/views/organiser-submissions-view";
import { OrganiserSubmissionView } from "@/components/views/organiser-submission-view";
import { OrganiserSessionView } from "@/components/views/organiser-session-view";
import { OrganiserSessionsView } from "@/components/views/organiser-sessions-view";

import { organiserSession, organiserSessionDetail, organiserTalk, sessionList, talkList } from "../fixtures";
import { renderApp } from "../render";

const rows = () => screen.getAllByRole("row").slice(1);
const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((c) => c.textContent);

describe("the submissions list", () => {
  test("has a search box and a status filter that keep what was asked", () => {
    renderApp(<OrganiserSubmissionsView list={talkList()} q="storm" status="withdrawn" />);
    expect(screen.getByRole("heading", { level: 1, name: "Submissions" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search submissions" })).toHaveValue("storm");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("withdrawn");
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  test("shows one row a submission: number, title, presenter, session, time in meeting time, status", () => {
    renderApp(
      <OrganiserSubmissionsView
        list={talkList([organiserTalk(), organiserTalk({ id: "470089", number: "173-2", withdrawn: true }), organiserTalk({ id: "1", number: "173-3", change: "moved" })])}
        q=""
        status="all"
      />,
    );
    expect(screen.getByText("3 submissions")).toBeInTheDocument();
    expect(within(screen.getAllByRole("row")[0]!).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Number",
      "Title",
      "Presenter",
      "Session",
      "Time (Mountain)",
      "Status",
    ]);
    expect(cells(rows()[0]!)).toEqual([
      "173-1",
      "Multi-Objective Optimization with Groundwater Models: Framing Complex Results for Resource Management Decisions",
      "Nicholas Corson-Dosch",
      "173",
      "Mon, Oct 12, 1:35 PM - 1:55 PM",
      "Scheduled",
    ]);
    expect(within(rows()[0]!).getByRole("link", { name: /Multi-Objective Optimization/ })).toHaveAttribute("href", "/organiser/talks/16121");
    expect(cells(rows()[1]!).at(-1)).toBe("Withdrawn");
    expect(cells(rows()[2]!).at(-1)).toBe("Moved");
  });

  test("says when nothing matches", () => {
    renderApp(<OrganiserSubmissionsView list={talkList([])} q="zzz" status="all" />);
    expect(screen.getByText("No submissions match.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("pages 50 at a time, keeping the search in each page's address", () => {
    renderApp(<OrganiserSubmissionsView list={talkList([organiserTalk()], { total: 120, page: 2 })} q="storm" status="all" />);
    const pages = screen.getByRole("navigation", { name: "Pages" });
    expect(within(pages).getByText("Page 2 of 3")).toBeInTheDocument();
    expect(within(pages).getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "/organiser?q=storm&status=all&page=1");
    expect(within(pages).getByRole("link", { name: "Next page" })).toHaveAttribute("href", "/organiser?q=storm&status=all&page=3");
  });
});

describe("a submission", () => {
  const move = (s: { number: string }) => <button type="button">{`Move to ${s.number}`}</button>;

  test("shows its session, time, room and status, with its withdraw control", () => {
    renderApp(
      <OrganiserSubmissionView talk={organiserTalk()} sessionQuery="" sessionResults={null} withdraw={<button type="button">Withdraw submission</button>} move={move} />,
    );
    expect(screen.getByText("Submission 173-1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Multi-Objective Optimization/);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      "Scheduled",
      "Nicholas Corson-Dosch",
      `173 - ${organiserTalk().sessionTitle}`,
      "Mon, Oct 12, 1:35 PM - 1:55 PM",
      "CCC, 111",
    ]);
    expect(screen.getByRole("link", { name: /^173 - / })).toHaveAttribute("href", "/organiser/sessions/96389");
    expect(screen.getByRole("button", { name: "Withdraw submission" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View in the attendee app" })).toHaveAttribute("href", "/talks/16121");
  });

  test("a withdrawn submission has no attendee page to view", () => {
    renderApp(<OrganiserSubmissionView talk={organiserTalk({ withdrawn: true })} sessionQuery="" sessionResults={null} withdraw={null} move={move} />);
    expect(screen.getAllByRole("definition")[0]).toHaveTextContent("Withdrawn");
    expect(screen.queryByRole("link", { name: "View in the attendee app" })).not.toBeInTheDocument();
  });

  test("finds sessions to move to, each with its move button, except the submission's own", () => {
    const results = sessionList([organiserSession(), organiserSession({ id: "96649", number: "174", title: "Emerging Contaminants" })]);
    renderApp(<OrganiserSubmissionView talk={organiserTalk()} sessionQuery="7" sessionResults={results} withdraw={null} move={move} />);
    const section = screen.getByRole("heading", { level: 2, name: "Move to another session" }).parentElement!;
    expect(within(section).getByRole("searchbox", { name: "Find a session" })).toHaveValue("7");
    const items = within(section).getAllByRole("listitem");
    expect(within(items[0]!).getByText("This submission's session")).toBeInTheDocument();
    expect(within(items[0]!).queryByRole("button")).not.toBeInTheDocument();
    expect(within(items[1]!).getByRole("button", { name: "Move to 174" })).toBeInTheDocument();
  });

  test("says when no session matches", () => {
    renderApp(<OrganiserSubmissionView talk={organiserTalk()} sessionQuery="zzz" sessionResults={sessionList([])} withdraw={null} move={move} />);
    expect(screen.getByText("No sessions match.")).toBeInTheDocument();
  });
});

describe("the sessions list", () => {
  test("shows each session's number, title, time, room, submissions and whether it changed", () => {
    renderApp(<OrganiserSessionsView list={sessionList([organiserSession(), organiserSession({ id: "2", number: "7", changed: true, talks: 1 })])} q="" />);
    expect(screen.getByRole("heading", { level: 1, name: "Manage Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search sessions" })).toHaveValue("");
    expect(cells(rows()[0]!)).toEqual(["173", organiserSession().title, "Mon, Oct 12, 1:30 PM - 5:30 PM", "CCC, 111", "13", "Published"]);
    expect(cells(rows()[1]!).at(-1)).toBe("Changed");
    expect(within(rows()[0]!).getByRole("link", { name: organiserSession().title })).toHaveAttribute("href", "/organiser/sessions/96389");
  });
});

describe("a session", () => {
  test("shows its time and room, the form slot, and every submission in it with its status", () => {
    renderApp(<OrganiserSessionView session={organiserSessionDetail({ changed: true })} form={<form aria-label="time form" />} />);
    expect(screen.getByText("Session 173")).toBeInTheDocument();
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      "Changed",
      "Mon, Oct 12, 1:30 PM - 5:30 PM",
      "CCC, 111",
    ]);
    expect(screen.getByRole("form", { name: "time form" })).toBeInTheDocument();
    const submissions = screen.getByRole("heading", { level: 2, name: "Submissions in this session" }).parentElement!;
    expect(within(submissions).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0]!.textContent)).toEqual(["173-1", "173-2"]);
    expect(within(submissions).getAllByRole("row")[2]).toHaveTextContent("Withdrawn");
    expect(screen.getByRole("link", { name: "View in the attendee app" })).toHaveAttribute("href", "/sessions/96389");
  });
});
