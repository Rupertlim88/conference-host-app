import { ProgramView } from "@/features/programmes";
import { orNotFound, serverApi } from "@/features/server";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await orNotFound((await serverApi()).tracks.get({ id }));
  return <ProgramView track={track} />;
}
