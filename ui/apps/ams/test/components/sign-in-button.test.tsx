// @vitest-environment jsdom
// The click goes to Google, which is not set up locally; Playwright cannot follow it either. This checks what the guest
// is offered, and what they see when Better Auth cannot start the sign-in.
import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const social = vi.fn();
vi.mock("better-auth/react", () => ({ createAuthClient: () => ({ signIn: { social }, signOut: vi.fn() }) }));

const { SignInButton } = await import("@/features/sign-in");
const { renderApp } = await import("../render");

test("the guest is offered Google sign-in by name", () => {
  renderApp(<SignInButton />);
  expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeEnabled();
});

test("a sign-in that cannot start says it did not finish", async () => {
  social.mockResolvedValueOnce({ data: null, error: { message: "Provider not found", status: 404 } });
  renderApp(<SignInButton />);
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in did not finish. Please try again.");
});

test("a sign-in whose request fails, such as with no network, says it did not finish", async () => {
  social.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  renderApp(<SignInButton />);
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in did not finish. Please try again.");
});
