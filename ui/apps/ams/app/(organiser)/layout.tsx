import { getTranslations } from "next-intl/server";

import { ConsoleShell } from "@/consoles/console-frame";
import { SignOutButton } from "@/shared/sign-in";
import { serverApi } from "@/shared/server";

// Any signed-in guest may use the organiser console: this is a demo (the host app's rule that it is always on).
export default async function OrganiserLayout({ children }: { children: React.ReactNode }) {
  await serverApi(); // sends anyone not signed in to the sign-in page
  const t = await getTranslations("organiser");
  const nav = [
    { href: "/organiser", label: t("papers") },
    { href: "/organiser/sessions", label: t("sessions") },
    { href: "/organiser/send", label: t("send") },
  ];
  return (
    <ConsoleShell title={t("name")} nav={nav} signOut={<SignOutButton />}>
      {children}
    </ConsoleShell>
  );
}
