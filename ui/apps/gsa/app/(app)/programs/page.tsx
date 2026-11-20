import { ProgramsView } from "@/components/views/programs-view";
import { serverApi } from "@/lib/server-api";

export default async function ProgramsPage() {
  const tracks = await (await serverApi()).tracks.list();
  return <ProgramsView tracks={tracks} />;
}
