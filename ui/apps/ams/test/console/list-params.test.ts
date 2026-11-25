import { expect, test } from "vitest";

import { listParams } from "@/features/console-frame";

test("reads search, status and page from the address", () => {
  expect(listParams({ q: " storm ", status: "withdrawn", page: "3" })).toEqual({ q: "storm", status: "withdrawn", page: 3 });
});

test("with nothing given lists everything from the first page", () => {
  expect(listParams({})).toEqual({ q: "", status: "all", page: 1 });
});

test("a repeated name counts once, and a bad value falls back on its own", () => {
  expect(listParams({ q: ["a", "b"], status: "deleted", page: "-2" })).toEqual({ q: "a", status: "all", page: 1 });
  expect(listParams({ page: "1.5" }).page).toBe(1);
  expect(listParams({ q: "x".repeat(150) }).q).toHaveLength(100);
});

test("a page number above the highest allowed asks for the highest, so the store shows the last page", () => {
  expect(listParams({ page: "20000" }).page).toBe(10_000);
});
