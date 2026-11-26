// A failure in the root layout itself replaces the whole document, so its page brings its own html, body and words.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import { GlobalError } from "@/shared/errors";

test("a failure in the root layout still says something went wrong in English, with Try again, as the main region", () => {
  const html = renderToStaticMarkup(<GlobalError reset={() => {}} retry={() => {}} />);
  expect(html).toMatch(/^<html lang="en">/);
  expect(html).toContain("<main");
  expect(html).toContain("Something went wrong.");
  expect(html).toContain("Try again");
});
