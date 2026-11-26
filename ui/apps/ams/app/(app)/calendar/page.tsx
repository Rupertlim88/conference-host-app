import { redirect } from "next/navigation";

import { firstDay } from "@/base/calendar";
import { serverApi } from "@/shared/server";

export default async function CalendarIndexPage() {
  const api = await serverApi();
  const [days, meeting] = await Promise.all([api.days.list(), api.meeting.get()]);
  const day = firstDay(days, meeting);
  redirect(day ? `/calendar/${day.date}` : "/");
}
