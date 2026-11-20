import type { Meeting } from "@repo/host-contracts";
import { CalendarDays, Layers, Search, Star, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

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
      <h1 className="mb-3 text-center text-2xl font-medium text-heading">{t("welcome")}</h1>
      <p className="mx-auto mb-5 max-w-prose text-sm">{t("intro")}</p>
      <section className="mx-auto mb-6 max-w-prose">
        <h2 className="mb-2 border-b pb-1 text-lg font-medium text-heading">{t("location")}</h2>
        <p className="text-sm">{t("where", { venue: meeting.venue, city: meeting.city })}</p>
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
