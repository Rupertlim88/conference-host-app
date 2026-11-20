import { PAGE_SIZE } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

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
