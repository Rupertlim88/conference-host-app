import { StarButton } from "@/base/my-schedule";
import { RelatedTalks } from "@/improvements/related-talks";
import { orNotFound, serverApi } from "@/shared/server";
import { TalkView } from "@/base/talk";

export default async function TalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const talk = await orNotFound((await serverApi()).talks.get({ id }));
  return <TalkView talk={talk} star={<StarButton target={{ targetKind: "talk", targetId: talk.id }} />} related={<RelatedTalks talkId={talk.id} />} />;
}
