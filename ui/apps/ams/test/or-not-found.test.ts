import { TRPCError } from "@trpc/server";
import { expect, test } from "vitest";

import { orNotFound } from "../lib/or-not-found";

// Next's notFound() throws an error whose digest asks Next to render the not-found page.
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

test("an answer passes straight through", async () => {
  await expect(orNotFound(Promise.resolve("talk"))).resolves.toBe("talk");
});

test("an unknown id shows the not-found page", async () => {
  await expect(orNotFound(Promise.reject(new TRPCError({ code: "NOT_FOUND" })))).rejects.toMatchObject(NOT_FOUND);
});

test("a malformed id in the address shows the not-found page too", async () => {
  await expect(orNotFound(Promise.reject(new TRPCError({ code: "BAD_REQUEST" })))).rejects.toMatchObject(NOT_FOUND);
});

test("any other failure is not hidden behind not-found", async () => {
  const failure = new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  await expect(orNotFound(Promise.reject(failure))).rejects.toBe(failure);
});
