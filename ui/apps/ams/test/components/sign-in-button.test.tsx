// @vitest-environment jsdom
// The click goes to Google, which is not set up locally; Playwright cannot follow it either. This checks what the guest is offered.
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SignInButton } from "@/components/sign-in-button";

import { renderApp } from "../render";

test("the guest is offered Google sign-in by name", () => {
  renderApp(<SignInButton />);
  expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeEnabled();
});
