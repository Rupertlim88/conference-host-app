import { OrganiserSubmissionsView } from "@/components/views/organiser-submissions-view";
import { listParams } from "@/lib/list-params";
import { serverApi } from "@/lib/server-api";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function SubmissionsPage({ searchParams }: { searchParams: Params }) {
  const input = listParams(await searchParams);
  const list = await (await serverApi()).organiser.talks.list(input);
  return <OrganiserSubmissionsView list={list} q={input.q} status={input.status} />;
}
