"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Starts Google sign-in. A sign-in that does not finish comes back to /sign-in?error=1. */
export function SignInButton() {
  const t = useTranslations("auth");
  return (
    <Button size="lg" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/sign-in?error=1" })}>
      {t("withGoogle")}
    </Button>
  );
}
