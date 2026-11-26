import { MEETING_ZONE } from "@/shared/app";
import { OrganiserSessionView, SessionForm } from "@/consoles/organiser-sessions";
import { orNotFound, serverApi } from "@/shared/server";
import { meetingClock } from "@/consoles/console-frame";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await orNotFound((await serverApi()).organiser.sessions.get({ id }));
  const start = meetingClock(session.startsAt, MEETING_ZONE);
  const end = meetingClock(session.endsAt, MEETING_ZONE);
  const initial = { date: start?.date ?? "", start: start?.time ?? "", end: end?.time ?? "", room: session.room };
  return <OrganiserSessionView session={session} form={<SessionForm sessionId={session.id} initial={initial} />} />;
}
