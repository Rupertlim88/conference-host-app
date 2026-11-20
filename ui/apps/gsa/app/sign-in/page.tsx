import { getHostServer } from "@repo/host-backend";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignInButton } from "@/components/sign-in-button";
import { SignInView } from "@/components/views/sign-in-view";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const server = getHostServer();
  if (await server.viewer(await headers())) redirect("/");
  const { error } = await searchParams;
  return <SignInView failed={Boolean(error)} googleReady={server.config.google !== null} signIn={<SignInButton />} />;
}
