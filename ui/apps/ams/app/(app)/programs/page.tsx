import { ProgramsView } from "@/features/programmes";
import { serverApi } from "@/features/server";

export default async function ProgramsPage() {
  const tracks = await (await serverApi()).tracks.list();
  return <ProgramsView tracks={tracks} />;
}
