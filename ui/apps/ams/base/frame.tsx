"use client";

// Every attendee page sits in one frame, like the Confex meeting app's, and its banner leads Home.

import type { Meeting } from "@repo/host-contracts";
import { Menu, Search, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { NavLinks } from "@/base/menu";
import { Logo } from "@/shared/marks";
import { TimeZoneProvider, TimeZoneSwitch } from "@/shared/meeting-time";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { VersionSwitch } from "@/versions/switch";
import type { VersionId } from "@/versions/versions";

/** The meeting app's frame: grey top bar, a banner, on computers a left-hand menu, and the demo's version bar. */
export function AppShell({
  meeting,
  version,
  signOut,
  children,
}: {
  meeting: Meeting;
  version: VersionId;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("app");
  return (
    <TimeZoneProvider>
      <div className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only">
          {t("skip")}
        </a>
        <TopBar signOut={signOut} />
        <Link
          href="/"
          className="flex items-center justify-between gap-3 px-4 py-2"
        >
          <Logo />{" "}
          <span className="text-right text-[11px] leading-tight font-semibold tracking-wide text-heading uppercase">
            {meeting.name} <br />
            <span className="font-normal normal-case">{meeting.city}</span>
          </span>
        </Link>
        <div
          className="h-1 bg-linear-to-r from-brand-navy via-brand-sky to-brand-mountain"
          aria-hidden
        />
        <div className="mx-auto flex max-w-6xl">
          <aside className="hidden w-64 shrink-0 border-r lg:block">
            <NavLinks />
          </aside>
          <main id="main" className="min-w-0 flex-1 px-4 pt-5 pb-24 lg:px-8">
            {children}
          </main>
        </div>
        <VersionSwitch current={version} />
      </div>
    </TimeZoneProvider>
  );
}

/** The meeting app's grey bar: sign-out and the time-zone switch on the left, My Schedule, search and the phone menu on
 *  the right. */
export function TopBar({ signOut }: { signOut: React.ReactNode }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-12 items-center justify-between border-b bg-neutral-100 px-3">
      <div className="flex items-center gap-3">
        {signOut}
        <TimeZoneSwitch />
      </div>
      <div className="flex items-center gap-3 text-heading">
        <Link href="/schedule" aria-label={t("schedule")}>
          <Star className="size-6" aria-hidden />
        </Link>
        <Link href="/search" aria-label={t("search")}>
          <Search className="size-6" aria-hidden />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger aria-label={t("menu")} className="lg:hidden">
            <Menu className="size-7" aria-hidden />
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0" closeLabel={t("close")}>
            <SheetHeader>
              <SheetTitle>{t("menu")}</SheetTitle>
            </SheetHeader>
            <NavLinks onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
