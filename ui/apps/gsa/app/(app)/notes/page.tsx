import { NotesView } from "@/components/views/notes-view";
import { serverApi } from "@/lib/server-api";

// The guest's notes change between visits, so this page is never cached.
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes = await (await serverApi()).notes.list();
  return <NotesView notes={notes} />;
}
