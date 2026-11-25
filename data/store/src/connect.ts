// Every connection to a database off this machine is encrypted.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Db = ReturnType<typeof drizzle>;

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ENCRYPTED = new Set(["require", "verify-ca", "verify-full"]);

/** How to reach the database so that every connection off this machine is encrypted: "require" when the address
 *  says nothing, undefined when it already asks for TLS or the database is local. An address off this machine
 *  that turns TLS off is refused. */
export function sslFor(url: string, env: Record<string, string | undefined> = process.env): "require" | undefined {
  const { hostname, searchParams } = new URL(url);
  // An address with no host reaches the host the driver falls back to: PGHOST, or else this machine. A PGHOST that
  // is a path is a socket on this machine.
  const host = hostname || env.PGHOST || "localhost";
  if (LOCAL.has(host) || host.startsWith("/")) return undefined;
  // The driver keeps the last sslmode an address names, so every one must ask for TLS.
  const modes = searchParams.getAll("sslmode");
  if (modes.length === 0) return "require";
  const off = modes.find((mode) => !ENCRYPTED.has(mode));
  if (off === undefined) return undefined;
  throw new Error(`The database at ${host} must be reached over an encrypted connection, not sslmode=${off}.`);
}

/** One small connection pool. Call close() when a command is done. */
export function connect(url: string): { db: Db; close: () => Promise<void> } {
  const ssl = sslFor(url);
  const client = postgres(url, { prepare: false, max: 4, onnotice: () => {}, ...(ssl ? { ssl } : {}) });
  return { db: drizzle(client), close: () => client.end() };
}
