import { describe, expect, test } from "vitest";

import { zonedDateTime, zonedInstant } from "../src/time";

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

describe("zonedDateTime", () => {
  test("Denver in January shows the meeting's clock, seven hours behind UTC", () => {
    expect(zonedDateTime(new Date("2027-01-11T15:30:00Z"), "America/Denver")).toBe("2027-01-11T08:30:00-07:00");
  });
  test("follows daylight saving: Denver in October is six hours behind", () => {
    expect(zonedDateTime(new Date("2026-10-12T19:35:00Z"), "America/Denver")).toBe("2026-10-12T13:35:00-06:00");
  });
  test("a late evening keeps the meeting's own date, though UTC has moved on", () => {
    expect(zonedDateTime(new Date("2027-01-13T05:00:00Z"), "America/Denver")).toBe("2027-01-12T22:00:00-07:00");
  });
  test("a zone ahead of UTC by a part hour", () => {
    expect(zonedDateTime(new Date("2027-01-11T03:00:00Z"), "Asia/Kolkata")).toBe("2027-01-11T08:30:00+05:30");
  });
  test("names the same instant that the meeting's clock gives back", () => {
    const at = zonedInstant("2027-01-11", "08:30", "America/Denver");
    expect(Date.parse(zonedDateTime(at, "America/Denver"))).toBe(at.getTime());
  });
});
