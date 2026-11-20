import { CalendarCheck, CalendarDays, ClipboardList, FileSearch, Home, Info, Mail, NotebookPen, Shapes, Tags, Terminal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const NAV = [
  { href: "/", key: "home", icon: Home },
  { href: "/about", key: "about", icon: Info },
  { href: "/search", key: "search", icon: FileSearch },
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/schedule", key: "schedule", icon: CalendarCheck },
  { href: "/programs", key: "abstractTypes", icon: Tags },
  { href: "/types", key: "sessionTypes", icon: Shapes },
  { href: "/notes", key: "notes", icon: NotebookPen },
  { href: "/notifications", key: "notifications", icon: Mail },
  { href: "/organiser", key: "organiser", icon: ClipboardList },
  { href: "/developer", key: "developer", icon: Terminal },
] as const;

/** Guidebook's side menu, in the order GSA Meetings Guide shows it, then the demo's two consoles. Used in the side panel and in the phone menu, which closes on a choice. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  return (
    <nav className="flex flex-col py-2">
      {NAV.map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate} className="flex items-center gap-4 px-4 py-3 text-[15px] text-foreground hover:bg-primary/5">
          <Icon className="size-6 text-primary" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
