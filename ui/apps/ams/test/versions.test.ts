import { expect, test } from "vitest";

import { nextVersion, VERSIONS, versionFrom } from "@/versions/versions";

test("the versions are the base and Our improvements, in that order", () => {
  expect(VERSIONS).toEqual(["base", "improvements"]);
});

test("a missing or unknown choice is the base", () => {
  expect(versionFrom(undefined)).toBe("base");
  expect(versionFrom("nonsense")).toBe("base");
  expect(versionFrom("improvements")).toBe("improvements");
});

test("switching goes to the next version, and from the last back to the base", () => {
  expect(nextVersion("base")).toBe("improvements");
  expect(nextVersion("improvements")).toBe("base");
});
