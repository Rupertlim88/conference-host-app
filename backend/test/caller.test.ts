import { describe, expect, test } from "vitest";

import { getHostServer } from "../src/server";

// Settings for a backend that never needs its database here: building it opens no connection.
Object.assign(process.env, {
  HOST_SOCIETY: "ams",
  HOST_DATABASE_URL: "postgres://u@localhost:5432/db",
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3001",
});

describe("a caller for a page", () => {
  test("acts as the guest the page already looked up, without looking them up again", async () => {
    const guest = { id: "u1", name: "Ada Author", email: "ada@example.com", image: null };
    const caller = getHostServer().callerFor(guest);
    expect(await caller.viewer.get()).toEqual({ name: "Ada Author", email: "ada@example.com", image: null });
  });

  test("with no guest, refuses everything but the question of who is signed in", async () => {
    const caller = getHostServer().callerFor(null);
    expect(await caller.viewer.get()).toBeNull();
    await expect(caller.meeting.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
