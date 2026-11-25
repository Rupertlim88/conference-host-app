"use client";

// Guests sign in with Google, and signing out cannot be undone with Back.

import { createAuthClient } from "better-auth/react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/features/frame";
import { Button } from "@/features/ui/button";

/** The sign-in page: the demo's name, that any Google account may sign in, a note when the last sign-in did not finish, and Google sign-in when it is set up. */
export function SignInView({ failed, googleReady, signIn }: { failed: boolean; googleReady: boolean; signIn: React.ReactNode }) {
  const t = useTranslations("auth");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <h1 className="text-2xl font-semibold text-heading">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      {failed && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {t("failed")}
        </p>
      )}
      {googleReady ? signIn : <p className="text-sm text-muted-foreground">{t("unavailable")}</p>}
    </main>
  );
}

/** Starts Google sign-in. A sign-in that does not finish at Google comes back to /sign-in?error=1; one that cannot
 *  start says so here. */
export function SignInButton() {
  const t = useTranslations("auth");
  const [failed, setFailed] = useState(false);
  const start = async () => {
    setFailed(false);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/sign-in?error=1" });
      if (result.error) setFailed(true);
    } catch {
      // The request itself failed, for example with no network.
      setFailed(true);
    }
  };
  return (
    <>
      <Button size="lg" onClick={start}>
        {t("withGoogle")}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}
    </>
  );
}

/** Ends the session, then replaces the page with sign-in and clears Next's router cache, so going Back cannot show a signed-in page from the cache. */
export function SignOutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
      className="flex items-center gap-1.5 text-xs font-medium text-heading"
    >
      <LogOut className="size-5" aria-hidden />
      <span className="leading-tight">{t("signOut")}</span>
    </button>
  );
}

export const authClient = createAuthClient();
