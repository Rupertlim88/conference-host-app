import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { OPERATIONS, buildOpenApi, endpointList, noticeIsEnough } from "../src/public/index";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("versions and retirement", () => {
  test("an operation is switched off only after at least six months' notice", () => {
    expect(noticeIsEnough({ announced: "2027-01-01", sunset: "2027-07-01" })).toBe(true);
    expect(noticeIsEnough({ announced: "2027-01-01", sunset: "2027-06-30" })).toBe(false);
    expect(noticeIsEnough({ announced: "2027-08-31", sunset: "2028-02-29" })).toBe(true);
    expect(noticeIsEnough({ announced: "2027-08-31", sunset: "2028-02-28" })).toBe(false);
    for (const [name, op] of Object.entries(OPERATIONS) as [string, { retiring?: { announced: string; sunset: string } }][]) {
      if (op.retiring !== undefined) expect(noticeIsEnough(op.retiring), name).toBe(true);
    }
  });

  test("the specification states the policy, and marks any retiring operation deprecated with its dates", () => {
    const spec = buildOpenApi() as Json;
    expect(spec["x-versioning"]).toMatchObject({ noticeMonths: 6 });
    for (const [name, op] of Object.entries(OPERATIONS) as [string, Json][]) {
      const published = spec.paths[op.path][op.method.toLowerCase()];
      expect(published.deprecated === true, name).toBe(op.retiring !== undefined);
    }
  });
});

describe("the endpoint list", () => {
  test("lists every endpoint with its owner and limits", () => {
    const list = endpointList();
    for (const op of Object.values(OPERATIONS)) {
      const row = list.split("\n").find((line) => line.startsWith(`| ${op.method} | \`${op.path}\` |`));
      expect(row, `${op.method} ${op.path}`).toBeDefined();
      expect(row).toContain(`${op.limits.requestsPerMinute}/min`);
    }
  });

  test("states body sizes in the units they are set in: decimal megabytes, or binary kibibytes", () => {
    const row = (name: keyof typeof OPERATIONS) => endpointList().split("\n").find((line) => line.includes(` | ${name} | `))!;
    expect(row("writeTalks")).toContain("| 10 MB body,");
    expect(row("searchMatches")).toContain("| 64 KiB body,");
  });

  test("the committed list matches the contract", () => {
    const committed = readFileSync(join(import.meta.dirname, "..", "endpoints.md"), "utf8");
    expect(committed).toBe(endpointList());
  });
});
