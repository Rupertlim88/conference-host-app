import { describe, expect, test } from "vitest";

import { cardLabel, toneOf } from "../lib/tones";

describe("toneOf", () => {
  test("names a tone for each kind of session", () => {
    expect(toneOf("Event")).toBe("event");
    expect(toneOf("Town Hall Meeting")).toBe("event");
    expect(toneOf("Poster Session")).toBe("poster");
    expect(toneOf("Joint Session")).toBe("joint");
    expect(toneOf("Panel Discussion")).toBe("panel");
    expect(toneOf("Break")).toBe("break");
    expect(toneOf("Session")).toBe("oral");
    expect(toneOf("")).toBe("oral");
  });
});

describe("cardLabel", () => {
  test("shows the kind once, and the number only when it adds something", () => {
    expect(cardLabel("Event", "Event")).toBe("Event");
    expect(cardLabel("Panel Discussion", "5A")).toBe("Panel Discussion 5A");
    expect(cardLabel("Joint Session", "J7")).toBe("Joint Session J7");
  });
  test("plain sessions show their number; breaks show nothing", () => {
    expect(cardLabel("Session", "7")).toBe("7");
    expect(cardLabel("", "")).toBe("");
    expect(cardLabel("Break", "Break")).toBe("");
  });
});
