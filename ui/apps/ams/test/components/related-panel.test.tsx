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
