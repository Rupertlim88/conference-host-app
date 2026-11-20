import { useTranslations } from "next-intl";

/** Isobar's own mark and name, so the demo is never taken for the society's app: isobars over Denver's mountains. */
export function Logo() {
  const t = useTranslations("app");
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" className="fill-brand-navy" />
        <g fill="none" strokeWidth="3.5" strokeLinecap="round">
          <path d="M10 15q7-5 14.67 0t14.67 0t14.66 0" className="stroke-white" />
          <path d="M10 24q7-5 14.67 0t14.67 0t14.66 0" className="stroke-brand-sky" />
        </g>
        <path d="M9 51 23 35l7 8 11-13 14 21Z" className="fill-brand-mountain" />
        <path d="M41 30l-4 4.7 2.4-.8 1.6 1.6 1.6-1.6 2.4.8Z" className="fill-white" />
      </svg>
      <span className="text-sm leading-tight font-semibold text-heading">{t("name")}</span>
    </span>
  );
}
