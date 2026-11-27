import { OrganiserSessionView, SessionForm } from "@/consoles/organiser-sessions";
import { orNotFound, serverApi } from "@/shared/server";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await orNotFound((await serverApi()).organiser.sessions.get({ id }));
  return <OrganiserSessionView session={session} form={<SessionForm session={session} />} />;
}
