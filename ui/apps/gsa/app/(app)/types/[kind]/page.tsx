import { TypeView } from "@/components/views/type-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function TypePage({ params }: { params: Promise<{ kind: string }> }) {
  const kind = decodeURIComponent((await params).kind);
  const sessions = await orNotFound((await serverApi()).sessions.ofKind({ kind }));
  return <TypeView kind={kind} sessions={sessions} />;
}
