import { getHostServer, type HostCaller } from "@repo/host-backend";
import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import "server-only";

/** The backend as the signed-in guest, for pages. Next renders a page alongside its layout, so every page calls this itself; without a guest it sends the visitor to sign in. */
export async function serverApi(): Promise<HostCaller> {
  const requestHeaders = await headers();
  const server = getHostServer();
  if (!(await server.viewer(requestHeaders))) redirect("/sign-in");
  return server.callerFor(requestHeaders);
}

/** Shows Next's not-found page when the backend does not know an id, or the id in the address is malformed. Other failures pass through. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) notFound();
    throw error;
  }
}
