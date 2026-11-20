import { describe, expect, test } from "vitest";

import { htmlToText } from "../src/html";

describe("htmlToText", () => {
  test("keeps paragraphs apart and drops tags", () => {
    expect(htmlToText("<div><p>First <b>part</b>.</p><p>Second&nbsp;part.</p></div>")).toBe(
      "First part.\n\nSecond part.",
    );
  });
  test("turns list items into bullets", () => {
    expect(htmlToText("<ul><li>One</li><li>Two</li></ul>")).toBe("• One\n\n• Two");
  });
  test("decodes named and numeric entities", () => {
    expect(htmlToText("Graff, W. J.&nbsp;(2026) &amp; &#8220;Storm&#x201D; &lt;b&gt;")).toBe(
      "Graff, W. J. (2026) & “Storm” <b>",
    );
  });
  test("collapses runs of spaces and line breaks inside a paragraph", () => {
    expect(htmlToText("\n\tA  line<br>broken\n here ")).toBe("A line broken here");
  });
  test("gives an empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
  });
});
