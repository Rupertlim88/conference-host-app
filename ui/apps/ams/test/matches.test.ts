import type { AroundAbstract } from "@repo/host-contracts";
import { expect, test, vi } from "vitest";

import { aroundAbstract } from "@/improvements/matches/matches";

import { talkSummary } from "./fixtures";

// The backend cannot run outside Next. React remembers the answer for one request only inside Next's server render, so
// that one answer per page is proved in the running app.
const view: AroundAbstract = { abstract: talkSummary(), abstractTrackIds: [], pools: null };
vi.mock("@/shared/server", () => ({ serverApi: async () => ({ improvements: { aroundAbstract: async () => view } }) }));

test("the improvements' answer is the backend's view around the fixed abstract", async () => {
  expect(await aroundAbstract()).toBe(view);
});
