import { CalendarDayView, DayList } from "@/base/calendar";
import { orNotFound, serverApi } from "@/shared/server";

export default async function CalendarDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const api = await serverApi();
  const [days, sessions] = await Promise.all([api.days.list(), orNotFound(api.days.sessions({ date }))]);
  return (
    <CalendarDayView date={date} days={days}>
      <DayList sessions={sessions} />
    </CalendarDayView>
  );
}
