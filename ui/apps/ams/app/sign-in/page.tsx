import { getHostServer } from "@repo/host-backend";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { firstParam } from "@/features/app";
import { SignInButton, SignInView } from "@/features/sign-in";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const server = getHostServer();
  if (await server.viewer(await headers())) redirect("/");
  const failed = Boolean(firstParam((await searchParams).error));
  return <SignInView failed={failed} googleReady={server.config.google !== null} signIn={<SignInButton />} />;
}
