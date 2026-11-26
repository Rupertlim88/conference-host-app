import { NamesView } from "@/base/names";
import { serverApi } from "@/shared/server";

export default async function Page() {
  const sections = await (await serverApi()).names.get({ page: "officers" });
  return <NamesView page="officers" sections={sections} />;
}
