import { describe, expect, test } from "vitest";

import { toClock24, zonedInstant } from "../src/time";

describe("zonedInstant", () => {
  test("Denver in October is six hours behind UTC", () => {
    expect(zonedInstant("2026-10-12", "13:35", "America/Denver").toISOString()).toBe("2026-10-12T19:35:00.000Z");
  });
  test("Houston in January is six hours behind UTC", () => {
    expect(zonedInstant("2026-01-27", "13:45", "America/Chicago").toISOString()).toBe("2026-01-27T19:45:00.000Z");
  });
  test("follows daylight saving: Denver in December is seven hours behind", () => {
    expect(zonedInstant("2026-12-01", "09:00", "America/Denver").toISOString()).toBe("2026-12-01T16:00:00.000Z");
  });
});

describe("toClock24", () => {
  test("reads 12-hour times", () => {
    expect(toClock24("01:35 PM")).toBe("13:35");
    expect(toClock24("12:05 PM")).toBe("12:05");
    expect(toClock24("12:30 AM")).toBe("00:30");
    expect(toClock24("9:00 AM")).toBe("09:00");
  });
  test("reads bare times as 24-hour", () => {
    expect(toClock24("9:02")).toBe("09:02");
  });
  test("gives null for anything else", () => {
    expect(toClock24("")).toBeNull();
    expect(toClock24("noon")).toBeNull();
    expect(toClock24("25:00")).toBeNull();
  });
});
