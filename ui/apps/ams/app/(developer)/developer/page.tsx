import { DeveloperActions, DeveloperView } from "@/features/developer";
import { serverApi } from "@/features/server";

export default async function DeveloperPage() {
  const status = await (await serverApi()).developer.status();
  return <DeveloperView status={status} actions={<DeveloperActions />} />;
}
