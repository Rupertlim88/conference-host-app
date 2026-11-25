import { SearchInputSchema } from "@repo/host-contracts";

import { SearchView } from "@/features/search";
import { firstParam } from "@/features/app";
import { serverApi } from "@/features/server";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const q = firstParam((await searchParams).q);
  const api = await serverApi();
  const input = SearchInputSchema.safeParse({ q });
  const results = input.success ? await api.search(input.data) : null;
  return <SearchView q={input.success ? input.data.q : q} results={results} />;
}
