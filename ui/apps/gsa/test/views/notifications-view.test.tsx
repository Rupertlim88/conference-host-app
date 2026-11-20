// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { NotificationsView } from "@/components/views/notifications-view";

import { renderApp } from "../render";

test("Notifications shows All and Unread tabs and, as in the real app, nothing yet", () => {
  renderApp(<NotificationsView />);
  expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeInTheDocument();
  expect(screen.getByText("All")).toBeInTheDocument();
  expect(screen.getByText("Unread (0)")).toBeInTheDocument();
  expect(screen.getByText("No notifications")).toBeInTheDocument();
});
