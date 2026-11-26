import { StarButton } from "@/base/my-schedule";
import { orNotFound, serverApi } from "@/shared/server";
import { SessionTalks, SessionView } from "@/base/session";
import { ChangePoint } from "@/versions/change";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await orNotFound((await serverApi()).sessions.get({ id }));
  return (
    <SessionView
      session={session}
      star={<StarButton target={{ targetKind: "session", targetId: session.id }} />}
      talks={
        <ChangePoint at="session.talks" props={{ session }}>
          <SessionTalks talks={session.talks} />
        </ChangePoint>
      }
    />
  );
}
