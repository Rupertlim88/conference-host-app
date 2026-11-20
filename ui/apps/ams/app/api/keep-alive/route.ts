import { getHostServer } from "@repo/host-backend";

// Vercel's daily cron (vercel.json) calls this so the free Supabase database never pauses. It runs on every call.
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return getHostServer().handleKeepAlive(req);
}
