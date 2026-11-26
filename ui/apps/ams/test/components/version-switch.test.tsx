// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { VersionSwitch } from "@/versions/switch";

import { renderApp } from "../render";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => {
  refresh.mockClear();
  document.cookie = "demo-version=; max-age=0; path=/";
});

test("the bar names the version shown, and its button switches to the next one", () => {
  renderApp(<VersionSwitch current="base" />);
  expect(screen.getByText("Showing: AMS's meeting app")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Switch to Our improvements" }));
  expect(document.cookie).toContain("demo-version=improvements");
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("pressing Control on its own switches; Control with another key does not", () => {
  renderApp(<VersionSwitch current="improvements" />);
  fireEvent.keyDown(window, { key: "Control" });
  fireEvent.keyDown(window, { key: "c", ctrlKey: true });
  fireEvent.keyUp(window, { key: "Control" });
  expect(refresh).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: "Control" });
  fireEvent.keyUp(window, { key: "Control" });
  expect(document.cookie).toContain("demo-version=base");
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("the bar links the demo's two consoles", () => {
  renderApp(<VersionSwitch current="base" />);
  expect(screen.getByRole("link", { name: "Organiser console" })).toHaveAttribute("href", "/organiser");
  expect(screen.getByRole("link", { name: "Developer console" })).toHaveAttribute("href", "/developer");
});
