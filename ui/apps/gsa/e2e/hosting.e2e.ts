import { expect, test } from "@playwright/test";

test("every page is sent with the security headers", async ({ request }) => {
  const res = await request.get("/sign-in");
  expect(res.status()).toBe(200);
  const headers = res.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
});

test("the keep-alive answers 401 without the cron secret", async ({ request }) => {
  expect((await request.get("/api/keep-alive")).status()).toBe(401);
  expect((await request.get("/api/keep-alive", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
});
