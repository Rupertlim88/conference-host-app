// Participating Program Committees and Officers show AMS's lists of names under their headings.
import type { NamePage, NameSection } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/base/frame";

/** A page of names: each heading with its lines of names, in AMS's order. */
export function NamesView({ page, sections }: { page: NamePage; sections: NameSection[] }) {
  const t = useTranslations();
  return (
    <>
      <PageTitle>{t(`menu.${page}`)}</PageTitle>
      {sections.length === 0 && <p className="text-sm text-muted-foreground">{t("lists.empty")}</p>}
      {sections.map((section, i) => (
        <section key={i} className="mb-5">
          <h2 className="mb-1 font-semibold text-heading">{section.heading}</h2>
          {section.lines.map((line, j) => (
            <p key={j} className="text-sm">
              {line}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
