import { getTranslations } from "next-intl/server";

import { ConsoleShell } from "@/components/console/console-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { serverApi } from "@/lib/server-api";

// Any signed-in guest may use the developer console: this is a demo (CLAUDE.md rule 6).
export default async function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const { verifyUrl } = await (await serverApi()).settings.get();
  const t = await getTranslations("developer");
  const nav = [
    { href: "/developer", label: t("status") },
    { href: "/organiser", label: (await getTranslations("nav"))("organiser") },
  ];
  return (
    <ConsoleShell title={t("name")} nav={nav} verifyUrl={verifyUrl} signOut={<SignOutButton />}>
      {children}
    </ConsoleShell>
  );
}
