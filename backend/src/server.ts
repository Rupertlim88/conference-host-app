// The backend is built once per process, from settings checked when it starts.
import { SocietySchema, type Society } from "@repo/host-contracts";
import { connect, createGuestData, createOrganiserStore, createProgramme, createSyncLog } from "@repo/host-store";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { betterAuth } from "better-auth";
import { z } from "zod";

import { attendeeRoutes } from "./attendee-router";
import { developerRouter, organiserRouter } from "./console-router";
import { authOptions, createCallerFactory, router, viewerFrom } from "./gate";
import { keepAlive } from "./keep-alive";
import { CONFERENCE_IDS, conferenceApi, unconfiguredApi } from "./matching-api";

const optional = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
/** A web address that is encrypted unless it stays on this machine. */
const WebAddress = z
  .url({ protocol: /^https?$/ })
  .refine((url) => {
    if (!URL.canParse(url)) return true; // z.url() already names this address as invalid
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" || LOCAL_HOSTS.has(hostname);
  }, "must use https unless it is on this machine");
const optionalAddress = z.preprocess((v) => (v === "" ? undefined : v), WebAddress.optional());

const EnvSchema = z
  .object({
    HOST_SOCIETY: SocietySchema,
    HOST_DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: WebAddress,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    CONFERENCE_API_URL: optionalAddress,
    CONFERENCE_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(16).optional()),
    CRON_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(16).optional()),
  });

/** Settings that come together or not at all. They are checked on the raw settings, so a pair is named even when
 *  another setting is wrong too. */
const PAIRS = [
  ["CONFERENCE_API_URL", "CONFERENCE_API_KEY"],
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
] as const;

function unpaired(env: Record<string, string | undefined>): string[] {
  const set = (name: string) => Boolean(env[name]);
  return PAIRS.flatMap(([a, b]) =>
    set(a) === set(b) ? [] : [set(a) ? `${b}: required when ${a} is set` : `${a}: required when ${b} is set`],
  );
}

export interface HostConfig {
  society: Society;
  databaseUrl: string;
  authSecret: string;
  authUrl: string;
  google: { clientId: string; clientSecret: string } | null;
  api: { url: string; key: string } | null;
  /** The secret Vercel's cron sends to the keep-alive route. */
  cronSecret: string | null;
}

/** Parses settings once, naming every setting that is wrong. */
export function readConfig(env: Record<string, string | undefined>): HostConfig {
  const parsed = EnvSchema.safeParse(env);
  const problems = [
    ...(parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)),
    ...unpaired(env),
  ];
  if (!parsed.success || problems.length > 0) throw new Error(`Host app settings are invalid: ${problems.join("; ")}`);
  const e = parsed.data;
  return {
    society: e.HOST_SOCIETY,
    databaseUrl: e.HOST_DATABASE_URL,
    authSecret: e.BETTER_AUTH_SECRET,
    authUrl: e.BETTER_AUTH_URL,
    google:
      e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
        ? { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET }
        : null,
    api: e.CONFERENCE_API_URL && e.CONFERENCE_API_KEY ? { url: e.CONFERENCE_API_URL, key: e.CONFERENCE_API_KEY } : null,
    cronSecret: e.CRON_SECRET ?? null,
  };
}

/** The API's address as safe to show: origin and path, without credentials, query or fragment. */
export function safeApiAddress(url: string): string {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

export const appRouter = router({ organiser: organiserRouter, developer: developerRouter, ...attendeeRoutes });

export type AppRouter = typeof appRouter;

export const createHostCaller = createCallerFactory(appRouter);
/** The router called directly, as server components use it. */
export type HostCaller = ReturnType<typeof createHostCaller>;

function build(env: Record<string, string | undefined>) {
  const config = readConfig(env);
  const { db } = connect(config.databaseUrl);
  const store = { ...createProgramme(db, config.society), ...createGuestData(db, config.society) };
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
