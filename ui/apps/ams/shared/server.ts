// Every page reads the backend on the server as the signed-in guest, and an item that is not there shows "not found".
import { getHostServer, type HostCaller } from "@repo/host-backend";
import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import "server-only";

/** The backend as the signed-in guest, for pages. Next renders a page alongside its layout, so every page calls this itself;
 *  the guest is looked up once for each request, however many times a page and its layout call it. Without a guest it
 *  sends the visitor to sign in. */
export const serverApi = cache(async (): Promise<HostCaller> => {
  const server = getHostServer();
  const guest = await server.viewer(await headers());
  if (!guest) redirect("/sign-in");
  return server.callerFor(guest);
});

/** Shows Next's not-found page when the backend does not know an id, or the id in the address is malformed. Other failures pass through. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) notFound();
    throw error;
  }
}
