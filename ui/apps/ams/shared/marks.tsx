// Every screen shows the demo's own mark, page titles and places in one way.
import { useTranslations } from "next-intl";

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

/** Where something happens, as the programme prints it: "403 (Colorado Convention Center)". No room means no place. */
export function placeOf(room: string, building: string): string {
  if (!room) return "";
  return building ? `${room} (${building})` : room;
}
