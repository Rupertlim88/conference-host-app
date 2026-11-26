import { StarButton } from "@/base/my-schedule";
import { orNotFound, serverApi } from "@/shared/server";
import { SessionView } from "@/base/session";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await orNotFound((await serverApi()).sessions.get({ id }));
  return <SessionView session={session} star={<StarButton target={{ targetKind: "session", targetId: session.id }} />} />;
}
