import { HomeView } from "@/features/frame";
import { serverApi } from "@/features/server";

export default async function HomePage() {
  const meeting = await (await serverApi()).meeting.get();
  return <HomeView meeting={meeting} />;
}
