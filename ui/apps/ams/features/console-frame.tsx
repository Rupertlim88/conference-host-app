import { type Changes, PAGE_SIZE, type TalkChange, type TalkStatusFilter, TalkStatusFilterSchema } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { z } from "zod";

import { firstParam, MEETING_ZONE } from "@/features/app";
import { cn } from "@/features/ui/utils";

/** A console's frame: its name, its sections, the way back to the attendee app, and sign-out. Dense and plain, like
 *  the organiser tools it imitates. */
export function ConsoleShell({
  title,
  nav,
  signOut,
  children,
}: {
  title: string;
  nav: { href: string; label: string }[];
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("console");
  const app = useTranslations("app");
  return (
    <div className="min-h-dvh bg-neutral-50">
      <a href="#main" className="sr-only focus:not-sr-only">
        {app("skip")}
      </a>
      <header className="border-b bg-heading text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link href={nav[0]?.href ?? "/"} className="text-sm font-semibold tracking-wide">
            {title}
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <span className="[&_button]:text-white">{signOut}</span>
          </div>
        </div>
        <nav aria-label={t("nav")} className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-1 px-4 pb-2 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
          <Link href="/" className="opacity-80 hover:underline">
            {t("attendee")}
          </Link>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-5">
        {children}
      </main>
    </div>
  );
}

/** The consoles' dense table: one line a row, a header row of column names. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-100 text-xs text-neutral-700 uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-2 py-1.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn("px-2 py-1.5 align-top", className)}>{children}</td>;
}

/** Previous and next links for a list of PAGE_SIZE a page. Nothing when everything fits on one page. */
export function Pager({ page, total, href }: { page: number; total: number; href: (page: number) => string }) {
  const t = useTranslations("console");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages === 1) return null;
  return (
    <nav aria-label={t("pages")} className="mt-3 flex items-center gap-4 text-sm">
      {page > 1 && (
        <Link href={href(page - 1)} className="text-primary underline">
          {t("previous")}
        </Link>
      )}
      <span>{t("page", { page, pages })}</span>
      {page < pages && (
        <Link href={href(page + 1)} className="text-primary underline">
          {t("next")}
        </Link>
      )}
    </nav>
  );
}

const STYLE = {
  scheduled: "border-neutral-300 text-neutral-700",
  withdrawn: "border-red-300 bg-red-50 text-red-800",
  moved: "border-amber-300 bg-amber-50 text-amber-900",
  rescheduled: "border-sky-300 bg-sky-50 text-sky-900",
  published: "border-neutral-300 text-neutral-700",
  changed: "border-amber-300 bg-amber-50 text-amber-900",
} as const;

function Chip({ kind }: { kind: keyof typeof STYLE }) {
  const t = useTranslations("console.status");
  return <span className={cn("inline-block rounded border px-1.5 py-0.5 text-xs font-medium", STYLE[kind])}>{t(kind)}</span>;
}

/** A paper's status: withdrawn, or how it differs from the published programme. */
export function PaperStatus({ withdrawn, change }: { withdrawn: boolean; change: TalkChange }) {
  return <Chip kind={withdrawn ? "withdrawn" : change === "none" ? "scheduled" : change} />;
}

/** A session's status: as published, or changed. */
export function SessionStatus({ changed }: { changed: boolean }) {
  return <Chip kind={changed ? "changed" : "published"} />;
}

/** A time in the console, always in the meeting's zone, since the session form reads times that way:
 *  "Tue, Jan 27, 1:45 PM - 3:00 PM". */
export function ConsoleTime({ start, end }: { start: string | null; end?: string | null }) {
  const format = useFormatter();
  const t = useTranslations("console");
  if (!start) return <>{t("noTime")}</>;
  const day = format.dateTime(new Date(start), { weekday: "short", month: "short", day: "numeric", timeZone: MEETING_ZONE });
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "numeric", minute: "2-digit", timeZone: MEETING_ZONE });
  return <>{`${day}, ${time(start)}${end ? ` - ${time(end)}` : ""}`}</>;
}

/** How the programme differs from the published one, counted. */
export function ChangesSummary({ changes }: { changes: Changes }) {
  const t = useTranslations("console.changes");
  const lines = (["moved", "rescheduled", "withdrawn", "sessions"] as const).filter((k) => changes[k] > 0);
  if (lines.length === 0) return <p className="text-sm">{t("none")}</p>;
  return (
    <ul className="list-disc pl-5 text-sm">
      {lines.map((k) => (
        <li key={k}>{t(k, { n: changes[k] })}</li>
      ))}
    </ul>
  );
}

type Param = string | string[] | undefined;

const Page = z.coerce.number().int().min(1).max(10_000).catch(1);

/** A console list's search, status filter and page from the address. Each bad value falls back on its own, so a
 *  hand-edited address still shows a list. */
export function listParams(sp: { q?: Param; status?: Param; page?: Param }): { q: string; status: TalkStatusFilter; page: number } {
  return {
    q: firstParam(sp.q).trim().slice(0, 100),
    status: TalkStatusFilterSchema.catch("all").parse(firstParam(sp.status)),
    page: Page.parse(firstParam(sp.page) || 1),
  };
}

/** An instant as the meeting's clocks show it: date YYYY-MM-DD and time HH:MM on the 24-hour clock. Null for none. */
export function meetingClock(iso: string | null, timeZone: string): { date: string; time: string } | null {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}
