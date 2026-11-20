import { MoveButton } from "@/components/console/move-button";
import { WithdrawButton } from "@/components/console/withdraw-button";
import { OrganiserPaperView } from "@/components/views/organiser-paper-view";
import { listParams } from "@/lib/list-params";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function PaperPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Params }) {
  const { id } = await params;
  const sq = listParams({ q: (await searchParams).sq }).q;
  const api = await serverApi();
  const talk = await orNotFound(api.organiser.talks.get({ id }));
  const sessionResults = sq ? await api.organiser.sessions.list({ q: sq }) : null;
  return (
    <OrganiserPaperView
      talk={talk}
      sessionQuery={sq}
      sessionResults={sessionResults}
      withdraw={<WithdrawButton talkId={talk.id} withdrawn={talk.withdrawn} />}
      move={(session) => <MoveButton talkId={talk.id} session={{ id: session.id, number: session.number }} />}
    />
  );
}
