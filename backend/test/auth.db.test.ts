import { connect, type Db } from "@repo/host-store";
import { migrateStore } from "@repo/host-store/migrate";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { authOptions, viewerFrom } from "../src/gate";
import type { HostConfig } from "../src/server";

const url = process.env.HOST_BACKEND_TEST_DATABASE_URL;
const config: HostConfig = {
  society: "ams",
  databaseUrl: url ?? "",
  authSecret: "s".repeat(32),
  authUrl: "http://localhost:3001",
  cronSecret: null,
  testerToken: null,
  google: null,
  api: null,
};

// The demo is open: anyone with a Google account may sign in (the host app's rule that it is always on).
describe.skipIf(!url)("sign-in", { timeout: 60_000 }, () => {
  const conn = url ? connect(url) : null;
  const db = (conn?.db ?? null) as Db;
  const auth = betterAuth({ ...authOptions(config, db), plugins: [testUtils()] });

  beforeAll(async () => {
    await migrateStore(db);
    await db.execute(sql`delete from sign_in.session; delete from sign_in.account; delete from sign_in."user"`);
  });
  afterAll(async () => {
    await conn?.close();
  });

  test("anyone with a Google account gets an account and a session, and is seen as the viewer", async () => {
    const helpers = (await auth.$context).test;
    const user = await helpers.saveUser(helpers.createUser({ email: "stranger@example.com", name: "Stranger" }));
    const { headers } = await helpers.login({ userId: user.id });
    expect(await viewerFrom(auth, headers)).toEqual({ id: user.id, name: "Stranger", email: "stranger@example.com", image: null });
  });

  test("someone signing in with Google again is found by Google's issuer and their Google id", async () => {
    const { internalAdapter } = await auth.$context;
    const key = { issuer: "https://accounts.google.com", accountId: "108313521415433875888" };
    const { user } = await internalAdapter.createOAuthUser(
      { email: "returning@example.com", name: "Returning", emailVerified: true },
      { providerId: "google", ...key },
    );
    expect(await internalAdapter.findAccountOwnerByKey(key)).toMatchObject({ kind: "owned", user: { id: user.id } });
  });

  test("no session is no viewer", async () => {
    expect(await viewerFrom(auth, new Headers())).toBeNull();
  });
});
