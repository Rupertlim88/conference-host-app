import { expect, test } from "vitest";

import { placeOf } from "../lib/place";

test("a room reads with its building in brackets", () => {
  expect(placeOf("403", "Colorado Convention Center")).toBe("403 (Colorado Convention Center)");
});

test("a room with no building reads alone, and no room means no place", () => {
  expect(placeOf("Hall B3", "")).toBe("Hall B3");
  expect(placeOf("", "Colorado Convention Center")).toBe("");
});
