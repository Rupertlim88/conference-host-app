import { getHostServer } from "@repo/host-backend";

// The tester reads AMS's whole published programme here, with its secret token. It changes with every load.
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return getHostServer().handleProgrammeMap(req);
}
