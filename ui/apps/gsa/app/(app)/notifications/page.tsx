import { NotificationsView } from "@/components/views/notifications-view";
import { serverApi } from "@/lib/server-api";

export default async function NotificationsPage() {
  await serverApi();
  return <NotificationsView />;
}
