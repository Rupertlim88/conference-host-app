import { HomeView } from "@/components/views/home-view";
import { serverApi } from "@/lib/server-api";

export default async function HomePage() {
  const meeting = await (await serverApi()).meeting.get();
  return <HomeView meeting={meeting} />;
}
