import { HomeView } from "@/base/frame";
import { serverApi } from "@/shared/server";

export default async function HomePage() {
  const meeting = await (await serverApi()).meeting.get();
  return <HomeView meeting={meeting} />;
}
