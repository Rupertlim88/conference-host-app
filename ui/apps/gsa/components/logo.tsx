import { useTranslations } from "next-intl";

/** The Strata mark and name; own branding, never GSA's. */
export function Logo() {
  const t = useTranslations("app");
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#1d5c4b" />
        <path d="M8 40l14-12 10 8 10-14 14 18v8H8z" fill="#7fc8a9" />
        <path d="M8 46h48v6H8z" fill="#c9a66b" />
        <path d="M8 52h48v4a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#8a6a3a" />
      </svg>
      <span className="text-sm leading-tight font-semibold text-heading">{t("name")}</span>
    </span>
  );
}
