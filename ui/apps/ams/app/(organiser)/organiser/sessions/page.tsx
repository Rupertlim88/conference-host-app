import { OrganiserSessionsView } from "@/consoles/organiser-sessions";
import { listParams } from "@/consoles/console-frame";
import { serverApi } from "@/shared/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function SessionsPage({ searchParams }: { searchParams: Params }) {
  const { q, page } = listParams(await searchParams);
  const list = await (await serverApi()).organiser.sessions.list({ q, page });
  return <OrganiserSessionsView list={list} q={q} />;
}
