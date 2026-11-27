// @vitest-environment jsdom
import type { RelatedTalks as Related } from "@repo/host-contracts";
import { screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { RelatedPanel, RelatedTalks } from "@/improvements/related-talks/related-talks";

import { talkSummary } from "../fixtures";
import { renderApp } from "../render";

// The backend cannot run outside Next; the panel and its loading are the real ones.
const backend = vi.hoisted(() => ({ asked: [] as string[], answer: async (): Promise<Related> => ({ status: "none" }) }));
vi.mock("@/shared/server", () => ({
  serverApi: async () => ({ talks: { related: (input: { id: string }) => (backend.asked.push(input.id), backend.answer()) } }),
}));

const region = () => screen.getByRole("region", { name: "Related talks" });

test("the panel always names itself and says its talks are related to this one", () => {
  renderApp(<RelatedPanel related={undefined} loading failed={false} />);
  expect(within(region()).getByRole("heading", { name: "Related talks" })).toBeInTheDocument();
  expect(within(region()).getByText("Talks related to this one, found by the conference API")).toBeInTheDocument();
});

test("while the API is asked, the panel says it is finding talks", () => {
  renderApp(<RelatedPanel related={undefined} loading failed={false} />);
  expect(within(region()).getByLabelText("Finding related talks…")).toBeInTheDocument();
});

test("each match links to its talk with its kind, day and time, number, title and reason", () => {
  const close = talkSummary({ id: "485830", number: "J1.4", title: "Evaluation of Three Ice Accumulation Models", startsAt: "2027-01-11T16:15:00.000Z" });
  const odd = talkSummary({ id: "487641", number: "5.1", title: "A Cloud-to-Ground Lightning Time Series", startsAt: "2027-01-12T15:30:00.000Z" });
  renderApp(
    <RelatedPanel
      related={{
        status: "matches",
        matches: [
          { talk: close, kind: "core", score: 0.9, reason: "Both use satellite retrievals." },
          { talk: odd, kind: "unexpected", score: 0.8, reason: "A method from data assimilation." },
        ],
      }}
      loading={false}
      failed={false}
    />,
  );
  const links = within(region()).getAllByRole("link");
  expect(links.map((l) => l.getAttribute("href"))).toEqual(["/talks/485830", "/talks/487641"]);
  expect(links[0]).toHaveAccessibleName("Close match Mon, Jan 11 · 9:15 AM J1.4 Evaluation of Three Ice Accumulation Models Both use satellite retrievals.");
  expect(links[1]).toHaveAccessibleName("Unexpected match Tue, Jan 12 · 8:30 AM 5.1 A Cloud-to-Ground Lightning Time Series A method from data assimilation.");
});

test("when the API has no matches, the panel shows empty", () => {
  renderApp(<RelatedPanel related={{ status: "none" }} loading={false} failed={false} />);
  expect(region()).toHaveTextContent(/^Related talksTalks related to this one, found by the conference API$/);
  expect(within(region()).queryByRole("list")).not.toBeInTheDocument();
});

test("when the API is down or the call fails, the panel says so and the page goes on", () => {
  const { unmount } = renderApp(<RelatedPanel related={{ status: "unavailable" }} loading={false} failed={false} />);
  expect(within(region()).getByText("Related talks are unavailable right now.")).toBeInTheDocument();
  unmount();
  renderApp(<RelatedPanel related={undefined} loading={false} failed />);
  expect(within(region()).getByText("Related talks are unavailable right now.")).toBeInTheDocument();
});

test("while the talks are still being matched, the panel says so and to look again in a moment", () => {
  renderApp(<RelatedPanel related={{ status: "judging" }} loading={false} failed={false} />);
  expect(region()).toHaveTextContent(
    /^Related talksTalks related to this one, found by the conference APIRelated talks are still being matched\. Look again in a moment\.$/,
  );
  expect(within(region()).queryByText("Related talks are unavailable right now.")).not.toBeInTheDocument();
});

test("the panel asks the backend for the talk on the screen and shows its matches", async () => {
  const talk = talkSummary({ id: "485830", number: "J1.4", title: "Evaluation of Three Ice Accumulation Models" });
  backend.asked = [];
  backend.answer = async () => ({ status: "matches", matches: [{ talk, kind: "core", score: 0.9, reason: "Both use satellite retrievals." }] });
  renderApp(await RelatedTalks({ talkId: "484769" }));
  expect(backend.asked).toEqual(["484769"]);
  expect(within(region()).getByRole("link")).toHaveAttribute("href", "/talks/485830");
});

test("when the backend fails, the panel says related talks are unavailable instead of breaking the page", async () => {
  backend.answer = async () => {
    throw new Error("The database is down");
  };
  renderApp(await RelatedTalks({ talkId: "484769" }));
  expect(within(region()).getByText("Related talks are unavailable right now.")).toBeInTheDocument();
});
