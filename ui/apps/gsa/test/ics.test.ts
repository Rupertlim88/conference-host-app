import { describe, expect, test } from "vitest";

import { toIcs } from "../lib/ics";

describe("toIcs", () => {
  test("writes one event with UTC times and escaped text", () => {
    const ics = toIcs({
      uid: "16121@strata-demo",
      title: "Multi-Objective Optimization; Groundwater, Models",
      start: "2026-10-12T19:35:00.000Z",
      end: "2026-10-12T19:55:00.000Z",
      location: "CCC, 111",
    });
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20261012T193500Z\r\n");
    expect(ics).toContain("DTEND:20261012T195500Z\r\n");
    expect(ics).toContain("SUMMARY:Multi-Objective Optimization\\; Groundwater\\, Models\r\n");
    expect(ics).toContain("LOCATION:CCC\\, 111\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  test("an event with no end lasts 30 minutes", () => {
    expect(toIcs({ uid: "x", title: "Poster", start: "2026-10-11T20:00:00.000Z", end: null, location: "" })).toContain(
      "DTEND:20261011T203000Z\r\n",
    );
  });
});
