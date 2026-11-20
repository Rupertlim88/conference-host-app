import { CalendarDays, ClipboardList, Home, Layers, Search, Star, Terminal, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

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
        <Link key={href} href={href} onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 text-sm text-heading hover:bg-primary/5">
          <Icon className="size-4" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
