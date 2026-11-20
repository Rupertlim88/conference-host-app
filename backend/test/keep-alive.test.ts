import { describe, expect, test } from "vitest";

import { keepAlive } from "../src/keep-alive";

const SECRET = "c".repeat(32);
const request = (authorization?: string) =>
  new Request("http://localhost/api/keep-alive", { headers: authorization ? { authorization } : {} });

describe("keepAlive", () => {
  test("with the cron secret, reads the database once and answers 200", async () => {
    const pings: string[] = [];
    const res = await keepAlive(request(`Bearer ${SECRET}`), SECRET, async () => {
      pings.push("ping");
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(pings).toEqual(["ping"]);
  });

  test("without the right secret answers 401 and touches nothing", async () => {
    const pings: string[] = [];
    const ping = async () => {
      pings.push("ping");
    };
    for (const header of [undefined, "Bearer wrong", `Bearer ${SECRET}x`, SECRET, `bearer ${SECRET}`]) {
      expect((await keepAlive(request(header), SECRET, ping)).status).toBe(401);
    }
    expect((await keepAlive(request(`Bearer ${SECRET}`), null, ping)).status).toBe(401);
    expect(pings).toEqual([]);
  });

  test("a database that fails answers 500 without its error", async () => {
    const res = await keepAlive(request(`Bearer ${SECRET}`), SECRET, async () => {
      throw new Error("connection refused to db.example.org");
    });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("db.example.org");
  });
});
