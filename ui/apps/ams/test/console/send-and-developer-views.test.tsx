// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { DeveloperView } from "@/features/developer";
import { SendView } from "@/features/send";

import { apiStatus, noChanges, syncRun } from "../fixtures";
import { renderApp } from "../render";

const section = (name: string) => screen.getByRole("heading", { level: 2, name }).parentElement!;

describe("the send page", () => {
  test("lists the changes from the published programme, the send control and the last runs", () => {
    renderApp(
      <SendView
        changes={{ moved: 1, rescheduled: 2, withdrawn: 1, sessions: 1 }}
        runs={[syncRun(), syncRun({ id: 2, state: "failed", error: "401 Unauthorized", sent: 0 })]}
        send={<button type="button">Send programme</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Send to API" })).toBeInTheDocument();
    expect(within(section("Changes from the published programme")).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "1 paper moved",
      "2 papers rescheduled",
      "1 paper withdrawn",
      "1 session changed",
    ]);
    expect(screen.getByRole("button", { name: "Send programme" })).toBeInTheDocument();
    const runs = within(section("Recent sends")).getAllByRole("row");
    expect(within(runs[0]!).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Started (Mountain)",
      "Result",
      "Sent",
      "Added",
      "Changed",
      "Withdrawn",
      "Note",
    ]);
    expect(within(runs[1]!).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Tue, Dec 1, 10:00 AM", "Sent", "4,522", "0", "2", "1", ""]);
    expect(within(runs[2]!).getAllByRole("cell").map((c) => c.textContent).slice(1, 2)).toEqual(["Failed"]);
    expect(within(runs[2]!).getAllByRole("cell").at(-1)).toHaveTextContent("401 Unauthorized");
  });

  test("with no changes and no runs says so", () => {
    renderApp(<SendView changes={noChanges()} runs={[]} send={null} />);
    expect(screen.getByText("No changes: the programme matches the published one.")).toBeInTheDocument();
    expect(screen.getByText("No sends yet.")).toBeInTheDocument();
  });
});

describe("the developer console", () => {
  test("shows the API address, whether a key is set, the last send and the changes", () => {
    renderApp(<DeveloperView status={apiStatus()} actions={<button type="button">Test connection</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Developer console" })).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((d) => d.textContent)).toEqual([
      "Conference API address",
      "API key",
      "Last send",
    ]);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      "https://api.example.org/",
      "Set",
      "Sent, Tue, Dec 1, 10:00 AM",
    ]);
    expect(within(section("Changes from the published programme")).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Test connection" })).toBeInTheDocument();
  });

  test("says what is not set, and that nothing was sent yet", () => {
    renderApp(<DeveloperView status={apiStatus({ apiAddress: null, keySet: false, lastRun: null })} actions={null} />);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["Not set", "Not set", "None yet"]);
  });
});
