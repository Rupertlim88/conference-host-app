import { ProgramsList, ProgramsView } from "@/base/programmes";
import { serverApi } from "@/shared/server";
import { ChangePoint } from "@/versions/change";

export default async function ProgramsPage() {
  const tracks = await (await serverApi()).tracks.list();
  return (
    <ProgramsView>
      <ChangePoint at="programmes.list" props={{ tracks }}>
        <ProgramsList tracks={tracks} />
      </ChangePoint>
    </ProgramsView>
  );
}
