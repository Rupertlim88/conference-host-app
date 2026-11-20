import "server-only";

import { getHostServer, type HostCaller } from "@repo/host-backend";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/** The backend as the signed-in guest, for pages. Next renders a page alongside its layout, so every page calls this itself; without a guest it sends the visitor to sign in. */
export async function serverApi(): Promise<HostCaller> {
  const requestHeaders = await headers();
  const server = getHostServer();
  if (!(await server.viewer(requestHeaders))) redirect("/sign-in");
  return server.callerFor(requestHeaders);
}
