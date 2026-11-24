import type { Viewer } from "@repo/host-contracts";
import type { HostStore, OrganiserStore, SyncLog } from "@repo/host-store";
import { initTRPC, TRPCError } from "@trpc/server";

import type { ConferenceApi } from "./conference-api";

/** What the developer console may show about the API settings: never the key itself. */
export interface ApiSettings {
  apiAddress: string | null;
  keySet: boolean;
}

export interface Context {
  store: HostStore;
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
