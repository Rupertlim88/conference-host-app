// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { RelatedPanel } from "@/components/related-panel";

import { talkSummary } from "../fixtures";
import { renderApp } from "../render";

const region = () => screen.getByRole("region", { name: "Related talks" });

test("the panel always names itself and says the conference API picked the talks", () => {
  renderApp(<RelatedPanel related={undefined} loading failed={false} />);
  expect(within(region()).getByRole("heading", { name: "Related talks" })).toBeInTheDocument();
  expect(within(region()).getByText("Picked for you by the conference API")).toBeInTheDocument();
});

test("while the API is asked, the panel says it is finding talks", () => {
  renderApp(<RelatedPanel related={undefined} loading failed={false} />);
  expect(within(region()).getByLabelText("Finding related talks…")).toBeInTheDocument();
});

test("each match links to its talk with its kind, day and time, number, title and reason", () => {
  const close = talkSummary({ id: "474842", number: "10.2", title: "Harmful Algal Blooms", startsAt: "2026-10-11T20:25:00.000Z" });
  const odd = talkSummary({ id: "475730", number: "4.4", title: "Particle Filters", startsAt: "2026-10-14T14:20:00.000Z" });
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
  expect(links.map((l) => l.getAttribute("href"))).toEqual(["/talks/474842", "/talks/475730"]);
  expect(links[0]).toHaveAccessibleName("Close match Sun, Oct 11 · 2:25 PM 10.2 Harmful Algal Blooms Both use satellite retrievals.");
  expect(links[1]).toHaveAccessibleName("Unexpected match Wed, Oct 14 · 8:20 AM 4.4 Particle Filters A method from data assimilation.");
});

test("when the API has no matches, the panel says so", () => {
  renderApp(<RelatedPanel related={{ status: "none" }} loading={false} failed={false} />);
  expect(within(region()).getByText("No related talks for this talk yet.")).toBeInTheDocument();
});

test("when the API is down or the call fails, the panel says so and the page goes on", () => {
  const { unmount } = renderApp(<RelatedPanel related={{ status: "unavailable" }} loading={false} failed={false} />);
  expect(within(region()).getByText("Related talks are unavailable right now.")).toBeInTheDocument();
  unmount();
  renderApp(<RelatedPanel related={undefined} loading={false} failed />);
  expect(within(region()).getByText("Related talks are unavailable right now.")).toBeInTheDocument();
});
