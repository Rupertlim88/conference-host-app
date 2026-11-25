"use client";

// Every attendee page sits in one frame, like the Confex meeting app's, and Home opens it.

import type { Meeting } from "@repo/host-contracts";
import {
  CalendarDays,
  ClipboardList,
  Home,
  Layers,
  Menu,
  Search,
  Star,
  Terminal,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { TimeZoneProvider, TimeZoneSwitch } from "@/features/meeting-time";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/features/ui/sheet";

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
          <main id="main" className="min-w-0 flex-1 px-4 py-5 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </TimeZoneProvider>
  );
}

/** The meeting app's grey bar: sign-out and the time-zone switch on the left, search and the phone menu on the right. */
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

const NAV = [
  { href: "/", key: "home", icon: Home },
  { href: "/programs", key: "programs", icon: Layers },
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/people", key: "people", icon: Users },
  { href: "/schedule", key: "schedule", icon: Star },
  { href: "/search", key: "search", icon: Search },
  { href: "/organiser", key: "organiser", icon: ClipboardList },
  { href: "/developer", key: "developer", icon: Terminal },
] as const;

/** The app's sections, in the meeting app's order, then the demo's two consoles. Used in the side bar and in the phone menu, which closes on a choice. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  return (
    <nav className="flex flex-col py-2">
      {NAV.map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-heading hover:bg-primary/5"
        >
          <Icon className="size-4" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}

/** Isobar's own mark and name, so the demo is never taken for the society's app: isobars over Denver's mountains. */
export function Logo() {
  const t = useTranslations("app");
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" className="fill-brand-navy" />
        <g fill="none" strokeWidth="3.5" strokeLinecap="round">
          <path
            d="M10 15q7-5 14.67 0t14.67 0t14.66 0"
            className="stroke-white"
          />
          <path
            d="M10 24q7-5 14.67 0t14.67 0t14.66 0"
            className="stroke-brand-sky"
          />
        </g>
        <path
          d="M9 51 23 35l7 8 11-13 14 21Z"
          className="fill-brand-mountain"
        />
        <path
          d="M41 30l-4 4.7 2.4-.8 1.6 1.6 1.6-1.6 2.4.8Z"
          className="fill-white"
        />
      </svg>
      <span className="text-sm leading-tight font-semibold text-heading">
        {t("name")}
      </span>
    </span>
  );
}

/** A page's one top heading, with an optional line above it naming what the page belongs to. */
export function PageTitle({
  eyebrow,
  children,
}: {
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <header className="mb-4 border-b-2 border-neutral-200 pb-3 text-center">
      {eyebrow && (
        <p className="mb-1 text-xs text-muted-foreground">{eyebrow}</p>
      )}
      <h1 className="text-xl leading-snug font-medium text-heading">
        {children}
      </h1>
    </header>
  );
}

const TILES = [
  { href: "/programs", key: "programs", icon: Layers },
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/people", key: "people", icon: Users },
  { href: "/schedule", key: "schedule", icon: Star },
  { href: "/search", key: "search", icon: Search },
] as const;

/** The meeting app's home: a welcome, a Location section, and a tile for each part of the programme. */
export function HomeView({ meeting }: { meeting: Meeting }) {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  return (
    <>
      <h1 className="mb-3 text-center text-2xl font-medium text-heading">
        {t("welcome")}
      </h1>
      <p className="mx-auto mb-5 max-w-prose text-sm">{t("intro")}</p>
      <section className="mx-auto mb-6 max-w-prose">
        <h2 className="mb-2 border-b pb-1 text-lg font-medium text-heading">
          {t("location")}
        </h2>
        <p className="text-sm">
          {t("where", { venue: meeting.venue, city: meeting.city })}
        </p>
      </section>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {TILES.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex aspect-square flex-col items-center justify-center gap-3 rounded-md border bg-white p-4 text-center text-sm text-heading shadow-sm hover:shadow"
          >
            <Icon className="size-12 stroke-[1.5]" aria-hidden />
            {nav(key)}
          </Link>
        ))}
      </div>
    </>
  );
}
