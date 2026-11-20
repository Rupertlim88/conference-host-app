import { authTables, type Db } from "@repo/host-store";
import type { Viewer } from "@repo/host-contracts";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { HostConfig } from "./config";

/** Better Auth settings for one hosted copy. Anyone with a Google account may sign in, because this is a demo. Tests add plugins to these same settings. */
export function authOptions(config: HostConfig, db: Db) {
  return {
    database: drizzleAdapter(db, { provider: "pg", schema: authTables }),
    secret: config.authSecret,
    baseURL: config.authUrl,
    socialProviders: config.google
      ? { google: { clientId: config.google.clientId, clientSecret: config.google.clientSecret, prompt: "select_account" as const } }
      : {},
  } satisfies BetterAuthOptions;
}

interface SessionReader {
  api: { getSession(args: { headers: Headers }): Promise<{ user: { id: string; name: string; email: string; image?: string | null } } | null> };
}

/** The signed-in person behind a request, or null. */
export async function viewerFrom(auth: SessionReader, headers: Headers): Promise<(Viewer & { id: string }) | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}
