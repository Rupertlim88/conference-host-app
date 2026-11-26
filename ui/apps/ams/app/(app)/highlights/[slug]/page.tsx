import { notFound } from "next/navigation";

import { HIGHLIGHT_LISTS, HighlightView } from "@/base/highlights";
import { serverApi } from "@/shared/server";

export default async function HighlightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = Object.hasOwn(HIGHLIGHT_LISTS, slug) ? HIGHLIGHT_LISTS[slug] : undefined;
  if (!list) notFound();
  return <HighlightView list={list} highlight={await (await serverApi()).highlights.get({ list })} />;
}
