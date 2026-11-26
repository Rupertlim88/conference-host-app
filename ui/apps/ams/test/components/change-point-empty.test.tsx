// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { ChangePoint } from "@/versions/change";

import { renderApp } from "../render";

// Next's request cookies and its server translations cannot run outside Next. The change point is the real one; Our
// improvements are a stand-in with one change that outlines its whole region and has nothing to show there.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "improvements" }) }) }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const messages = (await import("@/shared/text/en.json")).default;
  return { getTranslations: async (namespace: "versions.change") => createTranslator({ locale: "en", messages, namespace }) };
});
vi.mock("@/improvements", () => ({ nothingToShow: { at: "talk.afterAbstract", label: "relatedTalks", render: () => null } }));

test("a change that outlines its whole region draws that outline, empty, when it has nothing to show", async () => {
  const { container } = renderApp(await ChangePoint({ at: "talk.afterAbstract", props: { talkId: "493803" } }));
  const outline = screen.getByText("Our change: related talks").closest("section")!;
  expect(outline.textContent).toBe("Our change: related talks");
  expect(container.firstElementChild).toBe(outline);
});
