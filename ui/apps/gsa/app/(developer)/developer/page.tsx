import { DeveloperActions } from "@/components/console/developer-actions";
import { DeveloperView } from "@/components/views/developer-view";
import { serverApi } from "@/lib/server-api";

export default async function DeveloperPage() {
  const status = await (await serverApi()).developer.status();
  return <DeveloperView status={status} actions={<DeveloperActions />} />;
}
