// @vitest-environment jsdom
import type { AroundAbstract } from "@repo/host-contracts";
import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import * as chosen from "@/improvements";
import { ChangePoint, changesFrom, type Change } from "@/versions/change";

import { sessionSummary, talkSummary, track } from "../fixtures";
import { renderApp } from "../render";

// Next's request cookies, its server translations and the backend cannot run outside Next; the change point and the
// changes are the real ones.
const state = vi.hoisted(() => ({ version: undefined as string | undefined, around: null as AroundAbstract | null }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.version ? { value: state.version } : undefined) }),
}));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const messages = (await import("@/shared/text/en.json")).default;
  return { getTranslations: async (namespace: "versions.change") => createTranslator({ locale: "en", messages, namespace }) };
});
vi.mock("@/shared/server", () => ({
  serverApi: async () => ({ improvements: { aroundAbstract: async () => state.around }, talks: { related: async () => ({ status: "none" }) } }),
}));

const lightning = sessionSummary({ id: "76096", startsAt: "2027-01-12T15:30:00.000Z", endsAt: "2027-01-12T17:00:00.000Z" });
const coffee = sessionSummary({ id: "75349", kind: "Break", startsAt: "2027-01-12T17:00:00.000Z", endsAt: "2027-01-12T17:45:00.000Z" });
const match = { talk: talkSummary({ id: "490001", sessionId: "76096" }), kind: "core" as const, score: 0.9, reason: "Same records.", tracks: [] };

beforeEach(() => {
  state.version = "improvements";
  state.around = { abstract: talkSummary(), abstractTrackIds: [], matches: [match] };
});

test("in the base, a change point shows what the base has there", async () => {
  state.version = undefined;
  renderApp(await ChangePoint({ at: "calendar.day", props: { sessions: [lightning] }, children: <p>AMS's day</p> }));
  expect(screen.getByText("AMS's day")).toBeInTheDocument();
  expect(screen.queryByText(/^Our change/)).not.toBeInTheDocument();
});

test("a version's change shows in place of the base, in a gold outline labelled with what it changed", async () => {
  renderApp(await ChangePoint({ at: "programmes.list", props: { tracks: [track()] }, children: <p>AMS's list</p> }));
  expect(screen.getByText("Our change: other conferences, ranked for your abstract")).toBeInTheDocument();
  expect(screen.queryByText("AMS's list")).not.toBeInTheDocument();
});

test("a change that edits several parts outlines each part with the label, and the change point adds no outline", async () => {
  renderApp(await ChangePoint({ at: "calendar.day", props: { sessions: [lightning, coffee] }, children: <p>AMS's day</p> }));
  expect(screen.getAllByText(/^Our change/).map((label) => label.textContent)).toEqual(["Our change: recommended around your abstract · 8:30 AM"]);
  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/sessions/76096", "/sessions/75349"]);
  expect(screen.queryByText("AMS's day")).not.toBeInTheDocument();
});

test("Our improvements show each improvement switched on in their list, at its own change point", async () => {
  expect(Object.keys(chosen).sort()).toEqual(["conferencePicks", "relatedTalks", "sessionPicks", "timeBlockPicks"]);
  const changes = changesFrom(Object.values(chosen));
  for (const change of Object.values(chosen)) expect(changes[change.at]).toBe(change);
  renderApp(await ChangePoint({ at: "talk.afterAbstract", props: { talkId: "493803" } }));
  expect(screen.getByText("Our change: related talks")).toBeInTheDocument();
});

test("two improvements at one change point are refused", () => {
  const order: Change<"programmes.list"> = { at: "programmes.list", label: "conferencePicks", render: () => null };
  expect(() => changesFrom([order, { ...order }])).toThrow("Two improvements change programmes.list");
});
