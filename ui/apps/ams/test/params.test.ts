import { expect, test } from "vitest";

import { firstParam } from "@/features/app";

test("a query value reads as itself, a repeated one as its first value, and a missing one as empty", () => {
  expect(firstParam("storm")).toBe("storm");
  expect(firstParam(["storm", "rain"])).toBe("storm");
  expect(firstParam([])).toBe("");
  expect(firstParam(undefined)).toBe("");
});

test("drops the NUL character, which the database cannot hold", () => {
  expect(firstParam("ab\u0000c")).toBe("abc");
  expect(firstParam(["\u0000x", "y"])).toBe("x");
});
