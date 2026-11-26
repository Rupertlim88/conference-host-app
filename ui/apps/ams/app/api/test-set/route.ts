import { getHostServer } from "@repo/host-backend";

// A test set's send may write for up to SEND_DEADLINE_MS (5 minutes, backend/src/send.ts). 300 seconds is the most a
// Vercel Hobby function may run.
export const maxDuration = 300;

export function POST(req: Request) {
  return getHostServer().handleTestSet(req);
}
