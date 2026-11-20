import { createHash, timingSafeEqual } from "node:crypto";

const digest = (text: string) => createHash("sha256").update(text).digest();

/**
 * The daily keep-alive that stops a free Supabase project pausing for lack of use. Vercel's cron sends
 * `Authorization: Bearer <CRON_SECRET>`; the check compares digests in constant time. Anything else, or no secret
 * set, gets 401 and touches nothing. A failed database read gets 500 without its error.
 */
export async function keepAlive(req: Request, secret: string | null, ping: () => Promise<void>): Promise<Response> {
  const given = req.headers.get("authorization") ?? "";
  if (secret === null || !timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await ping();
  } catch (error) {
    console.error("keep-alive: the database read failed", error);
    return new Response("The database read failed", { status: 500 });
  }
  return Response.json({ ok: true });
}
