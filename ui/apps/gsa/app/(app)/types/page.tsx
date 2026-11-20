import { TypesView } from "@/components/views/types-view";
import { serverApi } from "@/lib/server-api";

export default async function TypesPage() {
  const kinds = await (await serverApi()).sessions.kinds();
  return <TypesView kinds={kinds} />;
}
