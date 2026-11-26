import { ProgramsView } from "@/base/programmes";
import { serverApi } from "@/shared/server";

export default async function ProgramsPage() {
  const tracks = await (await serverApi()).tracks.list();
  return <ProgramsView tracks={tracks} />;
}
