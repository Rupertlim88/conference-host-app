import { AboutView } from "@/components/views/about-view";
import { serverApi } from "@/lib/server-api";

export default async function AboutPage() {
  const meeting = await (await serverApi()).meeting.get();
  return <AboutView meeting={meeting} />;
}
