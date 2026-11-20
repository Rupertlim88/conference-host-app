// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { DeveloperControls } from "@/components/console/developer-actions";
import { MoveControl } from "@/components/console/move-button";
import { SendControl } from "@/components/console/send-panel";
import { SessionFormFields } from "@/components/console/session-form";
import { WithdrawControl } from "@/components/console/withdraw-button";

import { syncRun } from "../fixtures";
import { renderApp } from "../render";

const calls: string[] = [];
const record = (name: string) => () => calls.push(name);
const reset = () => calls.splice(0);

describe("withdraw control", () => {
  test("withdraws a shown paper and restores a withdrawn one", () => {
    reset();
    const { unmount } = renderApp(<WithdrawControl withdrawn={false} busy={false} failed={false} onWithdraw={record("withdraw")} onRestore={record("restore")} />);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw paper" }));
    unmount();
    renderApp(<WithdrawControl withdrawn busy={false} failed={false} onWithdraw={record("withdraw")} onRestore={record("restore")} />);
    fireEvent.click(screen.getByRole("button", { name: "Restore paper" }));
    expect(calls).toEqual(["withdraw", "restore"]);
  });

  test("cannot be pressed while saving, and says when a save failed", () => {
    renderApp(<WithdrawControl withdrawn={false} busy failed onWithdraw={record("x")} onRestore={record("y")} />);
    expect(screen.getByRole("button", { name: "Withdraw paper" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("That did not save. Please try again.");
  });
});

describe("move control", () => {
  test("names the session it moves to", () => {
    reset();
    renderApp(<MoveControl number="7" busy={false} failed={false} onMove={record("move")} />);
    fireEvent.click(screen.getByRole("button", { name: "Move to 7" }));
    expect(calls).toEqual(["move"]);
  });
});

describe("session form", () => {
  const initial = { date: "2027-01-11", start: "08:30", end: "10:00", room: "403" };

  test("starts from the session's times in meeting time and saves what was typed", () => {
    const saved: unknown[] = [];
    renderApp(<SessionFormFields initial={initial} busy={false} outcome={null} onSave={(v) => saved.push(v)} />);
    expect(screen.getByLabelText("Date")).toHaveValue("2027-01-11");
    expect(screen.getByLabelText("Start (Mountain)")).toHaveValue("08:30");
    fireEvent.change(screen.getByLabelText("Start (Mountain)"), { target: { value: "10:45" } });
    fireEvent.change(screen.getByLabelText("End (Mountain)"), { target: { value: "12:00" } });
    fireEvent.change(screen.getByLabelText("Room"), { target: { value: "Mile High 3A" } });
    fireEvent.click(screen.getByRole("button", { name: "Save session" }));
    expect(saved).toEqual([{ date: "2027-01-11", start: "10:45", end: "12:00", room: "Mile High 3A" }]);
  });

  test("lets the times be left empty, for a session with no time or no end", () => {
    renderApp(<SessionFormFields initial={{ date: "", start: "", end: "", room: "" }} busy={false} outcome={null} onSave={() => {}} />);
    for (const label of ["Date", "Start (Mountain)", "End (Mountain)"]) expect(screen.getByLabelText(label)).not.toBeRequired();
  });

  test("says it saved, or why it did not", () => {
    const cases = [
      ["saved", "status", "Session saved"],
      ["end-before-start", "alert", "The end must be after the start."],
      ["outside-meeting", "alert", "Pick a day during the meeting, or a day either side."],
      ["incomplete-time", "alert", "Give a date and a start time together, or leave all three times empty."],
      ["failed", "alert", "That did not save. Please try again."],
    ] as const;
    for (const [outcome, role, text] of cases) {
      const { unmount } = renderApp(<SessionFormFields initial={initial} busy={false} outcome={outcome} onSave={() => {}} />);
      expect(screen.getByRole(role)).toHaveTextContent(text);
      unmount();
    }
  });
});

describe("send control", () => {
  test("asks to confirm before sending, and can be cancelled", () => {
    reset();
    renderApp(<SendControl label="Send programme" busy={false} result={null} problem={null} onSend={record("send")} />);
    fireEvent.click(screen.getByRole("button", { name: "Send programme" }));
    expect(screen.getByText("Send the programme to the conference API now?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Send now" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send programme" }));
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    expect(calls).toEqual(["send"]);
  });

  test("reports a sent run, a failed run, a send already running, or a send that could not start", () => {
    const { unmount } = renderApp(<SendControl label="Send programme" busy={false} result={syncRun()} problem={null} onSend={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Sent 4,522 papers: 0 added, 2 changed, 1 withdrawn.");
    unmount();
    const failed = renderApp(<SendControl label="Send programme" busy={false} result={syncRun({ state: "failed", error: "401 Unauthorized" })} problem={null} onSend={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The send failed: 401 Unauthorized");
    failed.unmount();
    const running = renderApp(<SendControl label="Send programme" busy={false} result={null} problem="running" onSend={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("A send is already running. Try again when it has finished.");
    running.unmount();
    renderApp(<SendControl label="Send programme" busy={false} result={null} problem="error" onSend={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The send could not start. Please try again.");
  });

  test("shows that it is sending", () => {
    renderApp(<SendControl label="Send programme" busy result={null} problem={null} onSend={() => {}} />);
    expect(screen.getByRole("button", { name: "Send programme" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Sending the programme…");
  });
});

describe("developer controls", () => {
  const idle = { busy: false, failed: false };
  const props = {
    test: { ...idle, result: null },
    send: { busy: false, result: null, problem: null },
    reset: { ...idle, result: null },
    onTest: record("test"),
    onSend: record("send"),
    onReset: record("reset"),
  };

  test("tests the connection and says what it found", () => {
    const found = [
      [{ status: "ok", httpStatus: 200, ms: 45 }, "Connection works (200, 45 ms)."],
      [{ status: "not-set", httpStatus: null, ms: null }, "No API address or key is set."],
      [{ status: "refused-key", httpStatus: 401, ms: 20 }, "The API refused the key (401)."],
      [{ status: "no-programme", httpStatus: 404, ms: 20 }, "The API does not know this conference (404)."],
      [{ status: "no-programme", httpStatus: null, ms: null }, "There is no programme to test with."],
      [{ status: "unreachable", httpStatus: null, ms: 5000 }, "Could not reach the API."],
      [{ status: "unexpected-answer", httpStatus: 500, ms: 20 }, "The API gave an unexpected answer (500)."],
    ] as const;
    for (const [result, text] of found) {
      const { unmount } = renderApp(<DeveloperControls {...props} test={{ ...idle, result }} />);
      expect(screen.getByRole("status")).toHaveTextContent(text);
      unmount();
    }
    reset();
    renderApp(<DeveloperControls {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    expect(calls).toEqual(["test"]);
  });

  test("sends again after a confirm", () => {
    reset();
    renderApp(<DeveloperControls {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Send programme again" }));
    fireEvent.click(screen.getByRole("button", { name: "Send now" }));
    expect(calls).toEqual(["send"]);
  });

  test("resets to the published programme after a confirm, and says what it put back", () => {
    reset();
    const { unmount } = renderApp(<DeveloperControls {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset to published programme" }));
    expect(screen.getByText("Undo every organiser change and restore withdrawn papers?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset now" }));
    expect(calls).toEqual(["reset"]);
    unmount();
    renderApp(<DeveloperControls {...props} reset={{ ...idle, result: { talks: 2, sessions: 1 } }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Programme reset: 2 papers and 1 session put back.");
  });
});
