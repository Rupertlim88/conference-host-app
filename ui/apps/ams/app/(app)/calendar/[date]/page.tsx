import { CalendarDayView } from "@/components/views/calendar-day-view";
import { orNotFound } from "@/lib/or-not-found";
import { serverApi } from "@/lib/server-api";

export default async function CalendarDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const api = await serverApi();
  const [days, sessions] = await Promise.all([api.days.list(), orNotFound(api.days.sessions({ date }))]);
  return <CalendarDayView date={date} days={days} sessions={sessions} />;
}
