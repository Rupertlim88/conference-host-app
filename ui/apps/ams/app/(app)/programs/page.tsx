import { ProgramsView } from "@/base/programmes";
import { serverApi } from "@/shared/server";
import { ChangePoint } from "@/versions/change";

export default async function ProgramsPage() {
  const tracks = await (await serverApi()).tracks.list();
  return (
    <ChangePoint at="programmes.list" props={{ tracks }}>
      <ProgramsView tracks={tracks} />
    </ChangePoint>
  );
}
