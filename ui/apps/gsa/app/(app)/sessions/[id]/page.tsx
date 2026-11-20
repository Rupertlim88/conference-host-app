import { NoteEditor } from "@/components/note-editor";
import { StarButton } from "@/components/star-button";
import { SessionView } from "@/components/views/session-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await orNotFound((await serverApi()).sessions.get({ id }));
  const target = { targetKind: "session", targetId: session.id } as const;
  return <SessionView session={session} star={<StarButton target={target} />} note={<NoteEditor target={target} />} />;
}
