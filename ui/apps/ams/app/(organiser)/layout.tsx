import { getTranslations } from "next-intl/server";

import { ConsoleShell } from "@/components/console/console-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { serverApi } from "@/lib/server-api";

// Any signed-in guest may use the organiser console: this is a demo (CLAUDE.md rule 6).
export default async function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const { verifyUrl } = await (await serverApi()).settings.get();
  const t = await getTranslations("organiser");
  const nav = [
    { href: "/organiser", label: t("papers") },
    { href: "/organiser/sessions", label: t("sessions") },
    { href: "/organiser/send", label: t("send") },
  ];
  return (
    <ConsoleShell title={t("name")} nav={nav} verifyUrl={verifyUrl} signOut={<SignOutButton />}>
      {children}
    </ConsoleShell>
  );
}
