"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

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
