import { getTranslations } from "next-intl/server";

import { SendPanel } from "@/components/console/send-panel";
import { SendView } from "@/components/views/send-view";
import { serverApi } from "@/lib/server-api";

export default async function SendPage() {
  const api = await serverApi();
  const [changes, runs] = await Promise.all([api.organiser.programme.changes(), api.organiser.programme.runs()]);
  const t = await getTranslations("organiser.sendPage");
  return <SendView changes={changes} runs={runs} send={<SendPanel label={t("button")} />} />;
}
