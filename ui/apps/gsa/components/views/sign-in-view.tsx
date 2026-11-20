import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";

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
