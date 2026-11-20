import { RelatedTalks } from "@/components/related-talks";
import { StarButton } from "@/components/star-button";
import { TalkView } from "@/components/views/talk-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function TalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const talk = await orNotFound((await serverApi()).talks.get({ id }));
  return <TalkView talk={talk} star={<StarButton target={{ targetKind: "talk", targetId: talk.id }} />} related={<RelatedTalks talkId={talk.id} />} />;
}
