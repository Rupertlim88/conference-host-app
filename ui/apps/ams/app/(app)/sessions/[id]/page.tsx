import { StarButton } from "@/components/star-button";
import { SessionView } from "@/components/views/session-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await orNotFound((await serverApi()).sessions.get({ id }));
  return <SessionView session={session} star={<StarButton target={{ targetKind: "session", targetId: session.id }} />} />;
}
