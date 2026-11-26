import { getHostServer } from "@repo/host-backend";

// The tester reads its report on one abstract here, with its secret token. It asks the matching API afresh each time.
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return getHostServer().handleRecommendations(req);
}
