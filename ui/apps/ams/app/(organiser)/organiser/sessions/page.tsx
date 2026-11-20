import { OrganiserSessionsView } from "@/components/views/organiser-sessions-view";
import { listParams } from "@/lib/list-params";
import { serverApi } from "@/lib/server-api";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function SessionsPage({ searchParams }: { searchParams: Params }) {
  const { q, page } = listParams(await searchParams);
  const list = await (await serverApi()).organiser.sessions.list({ q, page });
  return <OrganiserSessionsView list={list} q={q} />;
}
