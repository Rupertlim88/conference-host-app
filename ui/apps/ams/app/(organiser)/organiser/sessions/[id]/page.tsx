import { SessionForm } from "@/components/console/session-form";
import { OrganiserSessionView } from "@/components/views/organiser-session-view";
import { MEETING_ZONE } from "@/lib/meeting";
import { meetingClock } from "@/lib/meeting-clock";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await orNotFound((await serverApi()).organiser.sessions.get({ id }));
  const start = meetingClock(session.startsAt, MEETING_ZONE);
  const end = meetingClock(session.endsAt, MEETING_ZONE);
  const initial = { date: start?.date ?? "", start: start?.time ?? "", end: end?.time ?? "", room: session.room };
  return <OrganiserSessionView session={session} form={<SessionForm sessionId={session.id} initial={initial} />} />;
}
