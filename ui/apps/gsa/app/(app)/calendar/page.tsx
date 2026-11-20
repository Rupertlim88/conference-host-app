import { redirect } from "next/navigation";

import { firstDay } from "@/lib/days";
import { serverApi } from "@/lib/server-api";

export default async function CalendarIndexPage() {
  const api = await serverApi();
  const [days, meeting] = await Promise.all([api.days.list(), api.meeting.get()]);
  const day = firstDay(days, meeting);
  redirect(day ? `/calendar/${day.date}` : "/");
}
