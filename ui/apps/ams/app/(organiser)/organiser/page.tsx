import { OrganiserPapersView } from "@/features/organiser-papers";
import { listParams } from "@/features/console-frame";
import { serverApi } from "@/features/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function PapersPage({ searchParams }: { searchParams: Params }) {
  const input = listParams(await searchParams);
  const list = await (await serverApi()).organiser.talks.list(input);
  return <OrganiserPapersView list={list} q={input.q} status={input.status} />;
}
