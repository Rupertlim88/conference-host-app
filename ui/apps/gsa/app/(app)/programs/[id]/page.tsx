import { ProgramView } from "@/components/views/program-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await orNotFound((await serverApi()).tracks.get({ id }));
  return <ProgramView track={track} />;
}
