import { describe, expect, test } from "vitest";

import { signInForTest } from "../src/testing";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;

describe.skipIf(!url)("signInForTest", { timeout: 60_000 }, () => {
  test("gives session cookies for a new user on the given domain", async () => {
    const env = {
      HOST_SOCIETY: "ams",
      HOST_DATABASE_URL: url!,
      BETTER_AUTH_SECRET: "s".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3001",
    };
    const { cookies, email } = await signInForTest(env, "localhost");
    expect(email).toMatch(/^e2e-.+@example\.com$/);
    expect(cookies.length).toBeGreaterThan(0);
    expect(cookies.every((c) => c.domain === "localhost")).toBe(true);
    expect(cookies.some((c) => c.name.includes("session_token"))).toBe(true);
  });
});
