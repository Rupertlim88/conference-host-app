// The pages that are AMS's own text are short pages in the demo's own words.
import { useTranslations } from "next-intl";

import { PageTitle } from "@/base/frame";

const INFORMATION = ["faqs", "presenters", "policies", "accessibility", "green-meetings", "social-media", "slack", "press", "clear-cache"] as const;
const RESOURCES = ["registration", "health-resources", "wellness-rooms", "safety-tips", "transportation", "local-restaurants"] as const;

/** General Information's nine pages, Attendee Resources' six and Technical Support. */
export const OUR_WORDS_PAGES = [...INFORMATION, ...RESOURCES, "support"] as const;
export type OurWordsPage = (typeof OUR_WORDS_PAGES)[number];

/** The group a page sits in, for the address and the title. */
export const groupOf = (page: OurWordsPage): "information" | "resources" | null =>
  (INFORMATION as readonly string[]).includes(page) ? "information" : (RESOURCES as readonly string[]).includes(page) ? "resources" : null;

/** One page in the demo's own words: its title, and what the page is for at a meeting. */
export function OurWordsView({ page }: { page: OurWordsPage }) {
  const t = useTranslations();
  const group = groupOf(page);
  return (
    <>
      <PageTitle>{t(group ? `menu.${group}.${page}` : "menu.support")}</PageTitle>
      <p className="mx-auto max-w-prose text-sm">{t(`ourWords.${page}`)}</p>
    </>
  );
}
