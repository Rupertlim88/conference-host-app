import { describe, expect, test } from "vitest";
import { ZodError } from "zod";

import { readFileSync } from "node:fs";

import { ConferenceListSchema, conferenceDatabaseName } from "../src/internal/index";

/** Shared with the matching worker's tests, so both name a conference's database the same way. */
const NAMES = JSON.parse(readFileSync(new URL("../fixtures/internal/conference-database-names.json", import.meta.url), "utf8")) as {
  valid: [string, string][];
  invalid: string[];
};

describe("conference database names", () => {
  test("are the conference id with a prefix and underscores", () =>
    expect(conferenceDatabaseName("aps-march-2027")).toBe("conf_aps_march_2027"));
  test("refuse an id that could escape its name", () => expect(() => conferenceDatabaseName("x; drop")).toThrow(ZodError));
  test("refuse upper case, so two ids never share a database", () =>
    expect(() => conferenceDatabaseName("APS-2027")).toThrow(ZodError));
  test("match the shared examples, which the matching worker checks too", () => {
    for (const [id, name] of NAMES.valid) expect(conferenceDatabaseName(id)).toBe(name);
    for (const id of NAMES.invalid) expect(() => conferenceDatabaseName(id), id).toThrow(ZodError);
  });
});

describe("the conferences the matching worker serves, as the control database lists them", () => {
  test("hold only conference ids", () => {
    expect(ConferenceListSchema.parse({ conferences: ["aps-2027", "ams-2027"] })).toEqual({ conferences: ["aps-2027", "ams-2027"] });
    expect(ConferenceListSchema.safeParse({ conferences: ["x; drop"] }).success).toBe(false);
    expect(ConferenceListSchema.safeParse({ conferences: [], extra: 1 }).success).toBe(false);
  });
});
