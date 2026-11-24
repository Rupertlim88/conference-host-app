import type { Meeting } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { TopBar } from "./top-bar";

/** Guidebook's frame: the green bar, and on computers the side menu as a panel. */
export function AppShell({
  meeting,
  signOut,
  children,
}: {
  meeting: Meeting;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("app");
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only">
        {t("skip")}
      </a>
      <TopBar title={meeting.name} signOut={signOut} />
      <div className="mx-auto flex max-w-6xl">
        <aside className="hidden w-72 shrink-0 border-r lg:block">
          <div className="border-b px-4 py-3">
            <Logo />
          </div>
          <NavLinks />
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 py-5 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
