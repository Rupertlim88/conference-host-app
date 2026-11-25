import { listParams } from "@/features/console-frame";
import { OrganiserPaperView } from "@/features/organiser-papers";
import { orNotFound, serverApi } from "@/features/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function PaperPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Params }) {
  const { id } = await params;
  const sq = listParams({ q: (await searchParams).sq }).q;
  const api = await serverApi();
  const talk = await orNotFound(api.organiser.talks.get({ id }));
  const sessionResults = sq ? await api.organiser.sessions.list({ q: sq }) : null;
  return <OrganiserPaperView talk={talk} sessionQuery={sq} sessionResults={sessionResults} />;
}
