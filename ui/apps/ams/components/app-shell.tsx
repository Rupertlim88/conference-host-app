import type { Meeting } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { TopBar } from "./top-bar";

/** The meeting app's frame: grey top bar, a banner, and on computers a left-hand menu. */
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
      <TopBar signOut={signOut} />
      <Link href="/" className="flex items-center justify-between gap-3 px-4 py-2">
        <Logo />{" "}
        <span className="text-right text-[11px] leading-tight font-semibold tracking-wide text-heading uppercase">
          {meeting.name}{" "}
          <br />
          <span className="font-normal normal-case">{meeting.city}</span>
        </span>
      </Link>
      <div className="h-1 bg-linear-to-r from-brand-navy via-brand-sky to-brand-mountain" aria-hidden />
      <div className="mx-auto flex max-w-6xl">
        <aside className="hidden w-64 shrink-0 border-r lg:block">
          <NavLinks />
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 py-5 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
