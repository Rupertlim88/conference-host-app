import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { describe, expect, test } from "vitest";

import type { Context } from "../src/gate";
import { appRouter } from "../src/server";

const viewer = { id: "u1", name: "Guest", email: "guest@example.org", image: null };

/** One request through the same handler the web app uses, with a store whose talk read is given. */
async function ask(path: string, talk: () => Promise<unknown>, signedIn = true) {
  const store = { talk } as unknown as Context["store"];
  const ctx = { store, viewer: signedIn ? viewer : null } as unknown as Context;
  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(`http://localhost/api/trpc/${path}`),
    router: appRouter,
    createContext: async () => ctx,
  });
  return (await res.json()) as { error: { message: string; data: { code: string; stack?: string } } };
}

describe("the gate's errors", () => {
  const input = encodeURIComponent(JSON.stringify({ id: "nope" }));

  test("an expected refusal carries its message and code, but never a stack", async () => {
    const { error } = await ask(`talks.get?input=${input}`, async () => null);
    expect(error.message).toBe("Talk not found");
    expect(error.data.code).toBe("NOT_FOUND");
    expect(error.data.stack).toBeUndefined();
  });

  test("an unexpected failure says only that something went wrong", async () => {
    const { error } = await ask(`talks.get?input=${input}`, async () => {
      throw new Error("relation ams2027.talks does not exist");
    });
    expect(error.message).toBe("Something went wrong");
    expect(error.data.stack).toBeUndefined();
  });

  test("a request with no signed-in guest is refused", async () => {
    const { error } = await ask(`talks.get?input=${input}`, async () => null, false);
    expect(error.data.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Sign in to see the programme.");
  });
});
