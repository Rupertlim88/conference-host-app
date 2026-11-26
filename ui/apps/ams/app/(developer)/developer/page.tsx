import { DeveloperActions, DeveloperView } from "@/consoles/developer";
import { serverApi } from "@/shared/server";

export default async function DeveloperPage() {
  const status = await (await serverApi()).developer.status();
  return <DeveloperView status={status} actions={<DeveloperActions />} />;
}
