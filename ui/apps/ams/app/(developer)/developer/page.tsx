import { DeveloperActions, DeveloperView } from "@/consoles/developer";
import { serverApi } from "@/shared/server";

export default async function DeveloperPage() {
  const api = await serverApi();
  const [status, abstract] = await Promise.all([api.developer.status(), api.developer.fixedAbstract()]);
  return <DeveloperView status={status} actions={<DeveloperActions abstract={abstract} />} />;
}
