import { NoteEditor } from "@/components/note-editor";
import { RelatedTalks } from "@/components/related-talks";
import { StarButton } from "@/components/star-button";
import { TalkView } from "@/components/views/talk-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function AbstractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const talk = await orNotFound((await serverApi()).talks.get({ id }));
  const target = { targetKind: "talk", targetId: talk.id } as const;
  return <TalkView talk={talk} star={<StarButton target={target} />} note={<NoteEditor target={target} />} related={<RelatedTalks talkId={talk.id} />} />;
}
