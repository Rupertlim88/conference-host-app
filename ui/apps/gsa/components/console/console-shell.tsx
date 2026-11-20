import Link from "next/link";
import { useTranslations } from "next-intl";

import { VerifyLink } from "@/components/verify-link";

/** A console's frame: its name, its sections, the way back to the attendee app, the verify link when one is set,
 *  and sign-out. Plain, like the organiser tools it imitates. */
export function ConsoleShell({
  title,
  nav,
  verifyUrl,
  signOut,
  children,
}: {
  title: string;
  nav: { href: string; label: string }[];
  verifyUrl: string | null;
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
            <VerifyLink url={verifyUrl} />
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
