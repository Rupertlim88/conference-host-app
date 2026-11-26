import { ProgramView } from "@/base/programmes";
import { orNotFound, serverApi } from "@/shared/server";

export default async function Page() {
  const track = await orNotFound((await serverApi()).tracks.byCode({ code: "TOWNHALL" }));
  return <ProgramView track={track} />;
}
