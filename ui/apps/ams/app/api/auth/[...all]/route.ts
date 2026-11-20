import { getHostServer } from "@repo/host-backend";

const handler = (req: Request) => getHostServer().handleAuth(req);

export { handler as GET, handler as POST };
