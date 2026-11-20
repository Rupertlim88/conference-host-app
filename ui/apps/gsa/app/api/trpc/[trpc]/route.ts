import { getHostServer } from "@repo/host-backend";

// A programme send may write for up to SEND_DEADLINE_MS (5 minutes, backend/src/send.ts). 300 seconds is the
// most a Vercel Hobby function may run.
export const maxDuration = 300;

const handler = (req: Request) => getHostServer().handleTrpc(req);

export { handler as GET, handler as POST };
