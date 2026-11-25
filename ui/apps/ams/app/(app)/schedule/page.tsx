import { ScheduleView } from "@/features/my-schedule";
import { serverApi } from "@/features/server";

// The guest's stars change between visits, so this page is never cached.
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const schedule = await (await serverApi()).schedule.get();
  return <ScheduleView schedule={schedule} />;
}
