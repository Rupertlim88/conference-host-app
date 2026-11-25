import { describe, expect, test } from "vitest";

import { zonedInstant } from "../src/time";

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
