// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SignInView } from "@/components/views/sign-in-view";

import { renderApp } from "../render";

const button = <button type="button">Sign in with Google</button>;

test("the sign-in page names the demo, says any Google account can sign in, and offers Google", () => {
  renderApp(<SignInView failed={false} googleReady signIn={button} />);
  expect(screen.getByText("Isobar Meetings 2027 (Demo)")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Sign in to the demo" })).toBeInTheDocument();
  expect(screen.getByText("This demo is open to anyone with a Google account.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("a sign-in that did not finish says so, and the button is offered again", () => {
  renderApp(<SignInView failed googleReady signIn={button} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Sign-in did not finish. Please try again.");
  expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
});

test("without Google set up, the page says so instead of offering the button", () => {
  renderApp(<SignInView failed={false} googleReady={false} signIn={button} />);
  expect(screen.getByText("Google sign-in is not set up on this copy of the demo.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
