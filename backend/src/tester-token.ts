// Every request from a tester needs the secret token, and with no token set the tester's requests are switched off.
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (text: string) => createHash("sha256").update(text).digest();

/** A plain-text answer, as every refusal to a tester is. */
export function plain(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });
}

/**
 * The one check every tester request passes. The tester sends `Authorization: Bearer <TESTER_TOKEN>`, compared by
 * digest in constant time. With no token set every request gets 503; without the right token, 401. Neither reaches
 * `handle`. An unexpected error answers 500 with no detail, and is logged on the server.
 */
export async function testerOnly(req: Request, token: string | null, handle: () => Promise<Response>): Promise<Response> {
  if (token === null) return plain(503, "The tester's requests are not set up on this host app.");
  const given = req.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(given), digest(`Bearer ${token}`))) {
    return plain(401, "A tester's request needs the secret token, as Authorization: Bearer <token>.", { "www-authenticate": "Bearer" });
  }
  try {
    return await handle();
  } catch (error) {
    console.error("tester request failed", error);
    return plain(500, "Something went wrong.");
  }
}
