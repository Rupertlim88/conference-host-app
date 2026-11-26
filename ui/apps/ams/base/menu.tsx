"use client";

// Home and the menu offer every button on the AMS meeting app's main screen, with an icon for each, in AMS's order, and nothing else.

import {
  Accessibility,
  Award,
  BadgeCheck,
  BadgeInfo,
  CalendarDays,
  ChevronDown,
  CircleQuestionMark,
  FileText,
  Flower2,
  GalleryVertical,
  Handshake,
  Hash,
  House,
  Info,
  Landmark,
  LayoutList,
  Leaf,
  type LucideIcon,
  MessageCircle,
  MessagesSquare,
  Mic,
  MonitorCog,
  Newspaper,
  Presentation,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Store,
  TrainFront,
  UserRoundCheck,
  Users,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { PageTitle } from "@/base/frame";

type GroupKey = "highlights" | "information" | "resources";
interface Button {
  key: string;
  href: string;
  icon: LucideIcon;
}
interface Group {
  group: GroupKey;
  href: string;
  icon: LucideIcon;
  items: Button[];
}

const sub = (group: GroupKey, key: string, icon: LucideIcon): Button => ({ key, href: `/${group}/${key}`, icon });

const GROUPS: Record<GroupKey, Group> = {
  highlights: {
    group: "highlights",
    href: "/highlights",
    icon: Sparkles,
    items: [
      sub("highlights", "people-themed", Users),
      sub("highlights", "supplementary", FileText),
      sub("highlights", "keynotes", Presentation),
      sub("highlights", "new-fellows", UserRoundCheck),
      sub("highlights", "posters", GalleryVertical),
      sub("highlights", "presidential", Mic),
      sub("highlights", "town-halls", MessagesSquare),
    ],
  },
  information: {
    group: "information",
    href: "/information",
    icon: Info,
    items: [
      sub("information", "faqs", CircleQuestionMark),
      sub("information", "presenters", Mic),
      sub("information", "policies", ScrollText),
      sub("information", "accessibility", Accessibility),
      sub("information", "green-meetings", Leaf),
      sub("information", "social-media", MessageCircle),
      sub("information", "slack", Hash),
      sub("information", "press", Newspaper),
      sub("information", "clear-cache", MonitorCog),
    ],
  },
  resources: {
    group: "resources",
    href: "/resources",
    icon: BadgeInfo,
    items: [
      sub("resources", "registration", BadgeCheck),
      sub("resources", "health-resources", Stethoscope),
      sub("resources", "wellness-rooms", Flower2),
      sub("resources", "safety-tips", ShieldCheck),
      sub("resources", "transportation", TrainFront),
      sub("resources", "local-restaurants", UtensilsCrossed),
    ],
  },
};

/** The buttons from Conferences and Symposia to the Career Fair, as AMS's home and menu both show them. */
const PROGRAMME_BUTTONS: Button[] = [
  { key: "programs", href: "/programs", icon: LayoutList },
  { key: "events", href: "/events", icon: Handshake },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "committees", href: "/committees", icon: UsersRound },
  { key: "officers", href: "/officers", icon: Users },
  { key: "exhibitHall", href: "/exhibit-hall", icon: Store },
  { key: "careerFair", href: "/career-fair", icon: Landmark },
];

/** AMS's menu, in its order: Home and Search, the programme's buttons, the three groups, the sponsors and support. */
const MENU: (Button | Group)[] = [
  { key: "home", href: "/", icon: House },
  { key: "search", href: "/search", icon: Search },
  ...PROGRAMME_BUTTONS,
  GROUPS.highlights,
  GROUPS.information,
  GROUPS.resources,
  { key: "sponsors", href: "/sponsors", icon: Award },
  { key: "support", href: "/support", icon: CircleQuestionMark },
];

const rowClass = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-heading hover:bg-primary/5";

/** AMS's menu, used in the side bar and in the phone menu, which closes on a choice. Each group opens and closes to
 *  its sub-items on its own. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("menu");
  const [open, setOpen] = useState<ReadonlySet<GroupKey>>(new Set());
  const toggle = (group: GroupKey) =>
    setOpen((now) => {
      const next = new Set(now);
      if (!next.delete(group)) next.add(group);
      return next;
    });
  return (
    <nav className="flex flex-col py-2">
      {MENU.map((entry) => {
        if (!("group" in entry)) {
          const Icon = entry.icon;
          return (
            <Link key={entry.href} href={entry.href} onClick={onNavigate} className={rowClass}>
              <Icon className="size-4 shrink-0" aria-hidden />
              {t(entry.key)}
            </Link>
          );
        }
        const Icon = entry.icon;
        const isOpen = open.has(entry.group);
        const title = t(`${entry.group}.title`);
        return (
          <div key={entry.group}>
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(entry.group)} className={rowClass}>
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{title}</span>
              <ChevronDown className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {isOpen && (
              <ul aria-label={title} className="pb-1 pl-7">
                {entry.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link href={item.href} onClick={onNavigate} className={rowClass}>
                        <ItemIcon className="size-4 shrink-0" aria-hidden />
                        {t(`${entry.group}.${item.key}`)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

const tileClass =
  "flex aspect-square flex-col items-center justify-center gap-3 rounded-md border bg-white p-4 text-center text-sm text-heading shadow-sm hover:shadow";

/** The meeting app's home: a short welcome in the demo's own words, then AMS's ten tiles. */
export function HomeView() {
  const t = useTranslations("menu");
  const home = useTranslations("home");
  const tiles = [
    ...PROGRAMME_BUTTONS.map((b) => ({ href: b.href, icon: b.icon, label: t(b.key) })),
    ...Object.values(GROUPS).map((g) => ({ href: g.href, icon: g.icon, label: t(`${g.group}.title`) })),
  ];
  return (
    <>
      <h1 className="mb-3 text-center text-2xl font-medium text-heading">{home("welcome")}</h1>
      <p className="mx-auto mb-5 max-w-prose text-center text-sm">{home("intro")}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={tileClass}>
            <Icon className="size-12 stroke-[1.5]" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}

/** A group's own page, which its tile opens: its sub-items under its name. */
export function GroupView({ group }: { group: GroupKey }) {
  const t = useTranslations("menu");
  return (
    <>
      <PageTitle>{t(`${group}.title`)}</PageTitle>
      <ul className="divide-y rounded-md border">
        {GROUPS[group].items.map(({ key, href, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-primary/5">
              <Icon className="size-4 shrink-0" aria-hidden />
              {t(`${group}.${key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
