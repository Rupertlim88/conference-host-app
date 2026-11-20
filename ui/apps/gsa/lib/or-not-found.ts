import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

/** Shows Next's not-found page when the backend does not know an id, or the id in the address is malformed. Other failures pass through. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) notFound();
    throw error;
  }
}
