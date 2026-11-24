import { connect, createOrganiserStore, createStore, createSyncLog } from "@repo/host-store";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { betterAuth } from "better-auth";

import { authOptions, viewerFrom } from "./auth";
import { CONFERENCE_IDS, conferenceApi, unconfiguredApi } from "./conference-api";
import { readConfig } from "./config";
import { keepAlive } from "./keep-alive";
import { safeApiAddress } from "./programme-rules";
import { appRouter, createHostCaller, type HostCaller } from "./router";

function build(env: Record<string, string | undefined>) {
  const config = readConfig(env);
  const { db } = connect(config.databaseUrl);
  const store = createStore(db, config.society);
  const api = config.api
    ? conferenceApi({ url: config.api.url, key: config.api.key, conference: CONFERENCE_IDS[config.society] })
    : unconfiguredApi;
  const organiser = createOrganiserStore(db, config.society);
  const log = createSyncLog(db, config.society);
  const settings = {
    apiAddress: config.api ? safeApiAddress(config.api.url) : null,
    keySet: config.api !== null,
  };
  const auth = betterAuth(authOptions(config, db));
  const viewer = (headers: Headers) => viewerFrom(auth, headers);

  return {
    config,
    viewer,
    handleAuth: (req: Request) => auth.handler(req),
    handleKeepAlive: (req: Request) => keepAlive(req, config.cronSecret, () => store.ping()),
    /** The router for server components, as the person behind these headers. */
    callerFor: async (headers: Headers): Promise<HostCaller> =>
      createHostCaller({ store, organiser, log, api, settings, viewer: await viewer(headers) }),
    handleTrpc: (req: Request) =>
      fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: async () => ({ store, organiser, log, api, settings, viewer: await viewer(req.headers) }),
        onError({ path, error }) {
          if (error.code === "INTERNAL_SERVER_ERROR") console.error(`tRPC error on ${path ?? "?"}:`, error);
        },
      }),
  };
}

let server: ReturnType<typeof build> | null = null;

/** One shared backend per process, built on first use so a build without settings still compiles. */
export function getHostServer() {
  server ??= build(process.env);
  return server;
}
