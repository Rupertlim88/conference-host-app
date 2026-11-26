import { afterEach, describe, expect, test, vi } from "vitest";

import { testerOnly } from "../src/tester-token";

const TOKEN = "t".repeat(48);
const request = (authorization?: string) =>
  new Request("http://localhost/api/programme-map", { headers: authorization ? { authorization } : {} });

describe("a tester's request", () => {
  afterEach(() => vi.restoreAllMocks());

  test("with the secret token, is handled", async () => {
    const res = await testerOnly(request(`Bearer ${TOKEN}`), TOKEN, async () => Response.json({ ok: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("without the right token, is refused with 401 and never handled", async () => {
    const handled: string[] = [];
    const handle = async () => {
      handled.push("handled");
      return new Response("ok");
    };
    for (const header of [undefined, "Bearer wrong", `Bearer ${TOKEN}x`, TOKEN, `bearer ${TOKEN}`, `Basic ${TOKEN}`]) {
      const res = await testerOnly(request(header), TOKEN, handle);
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toBe("Bearer");
    }
    expect(handled).toEqual([]);
  });

  test("while no token is set, is switched off with 503, whatever it carries", async () => {
    const handled: string[] = [];
    const res = await testerOnly(request(`Bearer ${TOKEN}`), null, async () => {
      handled.push("handled");
      return new Response("ok");
    });
    expect(res.status).toBe(503);
    expect(await res.text()).toMatch(/not set up/);
    expect(handled).toEqual([]);
  });

  test("that fails unexpectedly answers 500 without its insides, and the error is logged", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await testerOnly(request(`Bearer ${TOKEN}`), TOKEN, async () => {
      throw new Error("connection refused to db.example.org");
    });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("db.example.org");
    expect(logged).toHaveBeenCalled();
  });
});
