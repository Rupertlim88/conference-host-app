import { notFound } from "next/navigation";

import { groupOf, OUR_WORDS_PAGES, OurWordsView, type OurWordsPage } from "@/base/our-words";

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const known = (OUR_WORDS_PAGES as readonly string[]).includes(page) ? (page as OurWordsPage) : null;
  if (!known || groupOf(known) !== "information") notFound();
  return <OurWordsView page={known} />;
}
