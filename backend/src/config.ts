import { SocietySchema, type Society } from "@repo/host-contracts";
import { z } from "zod";

const optional = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
/** A web address that is encrypted unless it stays on this machine (CLAUDE.md rule 1). */
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
  })
  .superRefine((e, ctx) => {
    if (e.CONFERENCE_API_URL && !e.CONFERENCE_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["CONFERENCE_API_KEY"], message: "required when CONFERENCE_API_URL is set" });
    }
    if (e.GOOGLE_CLIENT_ID && !e.GOOGLE_CLIENT_SECRET) {
      ctx.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_SECRET"], message: "required when GOOGLE_CLIENT_ID is set" });
    }
  });

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
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Host app settings are invalid: ${problems}`);
  }
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
