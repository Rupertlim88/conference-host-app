// @vitest-environment jsdom
// The withdraw control as wired to the backend. Once a change saves, the button shows the new state at once, so a
// second press undoes the change instead of sending the same one again while the page reloads its data.
import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const sent: string[] = [];
const mutation = (name: string) => ({
  useMutation: (options: { onSuccess: () => void }) => ({
    mutate: () => {
      sent.push(name);
      options.onSuccess();
    },
    isPending: false,
    isError: false,
  }),
});
vi.mock("@/features/connection", () => ({ trpc: { organiser: { talks: { withdraw: mutation("withdraw"), restore: mutation("restore") } } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const { WithdrawButton } = await import("@/features/organiser-papers");
const { renderApp } = await import("../render");

test("a saved withdrawal shows Restore at once, and a second press restores", () => {
  renderApp(<WithdrawButton talkId="498161" withdrawn={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Withdraw paper" }));
  fireEvent.click(screen.getByRole("button", { name: "Restore paper" }));
  expect(sent).toEqual(["withdraw", "restore"]);
});
