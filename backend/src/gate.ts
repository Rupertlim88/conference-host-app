import type { Viewer } from "@repo/host-contracts";
import { authTables, type Db, type GuestData, type OrganiserStore, type ProgrammeStore, type SyncLog } from "@repo/host-store";
import { initTRPC, TRPCError } from "@trpc/server";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { ConferenceApi } from "./matching-api";
import type { HostConfig } from "./server";

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

/** What the developer console may show about the API settings: never the key itself. */
export interface ApiSettings {
  apiAddress: string | null;
  keySet: boolean;
}

export interface Context {
  store: ProgrammeStore & GuestData;
  organiser: OrganiserStore;
  log: SyncLog;
  api: ConferenceApi;
  settings: ApiSettings;
  viewer: (Viewer & { id: string }) | null;
}

const t = initTRPC.context<Context>().create({
  // Unexpected errors carry SQL and stack traces; clients outside development see a plain message.
  errorFormatter({ shape, error }) {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    if (error.code !== "INTERNAL_SERVER_ERROR" || process.env.NODE_ENV === "development") return shape;
    const data = { ...shape.data };
    delete data.stack;
    return { ...shape, message: "Something went wrong", data };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

/** Every procedure but viewer.get: only a signed-in person sees the programme. */
export const viewerProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.viewer) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to see the programme." });
  return next({ ctx: { ...ctx, viewer: ctx.viewer } });
});
