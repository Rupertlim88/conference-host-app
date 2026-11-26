// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { TalkView } from "@/base/talk";

import { talkDetail } from "../fixtures";
import { renderApp } from "../render";

const slots = { star: null, related: null };

test("the title reads number, dash, title, as the meeting app prints it", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "J1.2 - What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us.",
  );
});

test("a talk with no number is titled by its title alone", () => {
  renderApp(<TalkView talk={talkDetail({ number: "" })} {...slots} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^What is a Snow Squall\?/);
});

test("under the title: day, time, place, then the authors", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual([
    "Monday, January 11, 2027",
    "8:45 AM - 9:00 AM",
    "403 (Colorado Convention Center)",
  ]);
  expect(screen.getByText("Andrew A. Rosenow, CIWRO - Cooperative Institute for Severe and High Impact Weather Research and Operations, Norman, OK")).toBeInTheDocument();
});

test("the abstract keeps its paragraphs", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getByRole("heading", { level: 2, name: "Abstract" })).toBeInTheDocument();
  expect(screen.getByText(/^Snow squalls are short-fuse winter hazards/).tagName).toBe("P");
  expect(screen.getByText("This presentation looks at eight years of snow squall warnings.").tagName).toBe("P");
});

test("a talk with no abstract says none was published", () => {
  renderApp(<TalkView talk={talkDetail({ abstract: "" })} {...slots} />);
  expect(screen.getByText("No abstract was published for this presentation.")).toBeInTheDocument();
});

test("a poster names its board", () => {
  renderApp(<TalkView talk={talkDetail({ kind: "poster", booth: "142" })} {...slots} />);
  expect(screen.getByText("Poster 142")).toBeInTheDocument();
});

test("the talk links back to its session", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getByRole("link", { name: /^J1 - Decision Support I/ })).toHaveAttribute("href", "/sessions/77102");
});

test("a talk outside any session has no session link, and no citation means no citation section", () => {
  renderApp(<TalkView talk={talkDetail({ session: null, citation: "" })} {...slots} />);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Citation" })).not.toBeInTheDocument();
});

test("the citation is shown under its heading", () => {
  renderApp(<TalkView talk={talkDetail()} {...slots} />);
  expect(screen.getByRole("heading", { level: 2, name: "Citation" })).toBeInTheDocument();
  expect(screen.getByText(/^Rosenow, A\. A\. \(2027\)/)).toBeInTheDocument();
});

test("the star sits under the title and the related talks come after the abstract", () => {
  renderApp(<TalkView talk={talkDetail()} star={<button type="button">star</button>} related={<section aria-label="related" />} />);
  const star = screen.getByRole("button", { name: "star" });
  const abstract = screen.getByRole("heading", { name: "Abstract" });
  const related = screen.getByRole("region", { name: "related" });
  expect(screen.getByRole("heading", { level: 1 }).compareDocumentPosition(star)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(abstract.compareDocumentPosition(related)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});
