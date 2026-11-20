import { randomUUID } from "node:crypto";
import { connect } from "@repo/host-store";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

import { authOptions } from "./auth";
import { readConfig } from "./config";

export interface TestCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
  expires?: number;
}

/** For end-to-end tests only: creates a user with a fresh e2e address and returns its session cookies. Never imported by app code. */
export async function signInForTest(
  env: Record<string, string | undefined>,
  domain: string,
): Promise<{ email: string; cookies: TestCookie[] }> {
  const config = readConfig(env);
  const { db, close } = connect(config.databaseUrl);
  try {
    const email = `e2e-${randomUUID()}@example.com`;
    const auth = betterAuth({ ...authOptions(config, db), plugins: [testUtils()] });
    const helpers = (await auth.$context).test;
    const user = await helpers.saveUser(helpers.createUser({ email, name: "E2E Guest" }));
    const cookies = (await helpers.getCookies({ userId: user.id, domain })) as TestCookie[];
    return { email, cookies };
  } finally {
    await close();
  }
}
