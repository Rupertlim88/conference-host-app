import { getTranslations } from "next-intl/server";

import { ConsoleShell } from "@/consoles/console-frame";
import { SignOutButton } from "@/shared/sign-in";
import { serverApi } from "@/shared/server";

// Any signed-in guest may use the developer console: this is a demo (CLAUDE.md rule 6).
export default async function DeveloperLayout({ children }: { children: React.ReactNode }) {
  await serverApi(); // sends anyone not signed in to the sign-in page
  const t = await getTranslations("developer");
  const nav = [
    { href: "/developer", label: t("status") },
    { href: "/organiser", label: (await getTranslations("nav"))("organiser") },
  ];
  return (
    <ConsoleShell title={t("name")} nav={nav} signOut={<SignOutButton />}>
      {children}
    </ConsoleShell>
  );
}
