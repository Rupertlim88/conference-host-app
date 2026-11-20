import { OrganiserPapersView } from "@/components/views/organiser-papers-view";
import { listParams } from "@/lib/list-params";
import { serverApi } from "@/lib/server-api";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function PapersPage({ searchParams }: { searchParams: Params }) {
  const input = listParams(await searchParams);
  const list = await (await serverApi()).organiser.talks.list(input);
  return <OrganiserPapersView list={list} q={input.q} status={input.status} />;
}
