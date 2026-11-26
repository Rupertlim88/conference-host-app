import { StarButton } from "@/base/my-schedule";
import { TalkView } from "@/base/talk";
import { orNotFound, serverApi } from "@/shared/server";
import { ChangePoint } from "@/versions/change";

export default async function TalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const talk = await orNotFound((await serverApi()).talks.get({ id }));
  return (
    <TalkView
      talk={talk}
      star={<StarButton target={{ targetKind: "talk", targetId: talk.id }} />}
      afterAbstract={<ChangePoint at="talk.afterAbstract" props={{ talkId: talk.id }} />}
    />
  );
}
