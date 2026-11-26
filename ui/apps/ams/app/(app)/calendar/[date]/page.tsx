import { CalendarDayView, DayList } from "@/base/calendar";
import { orNotFound, serverApi } from "@/shared/server";
import { ChangePoint } from "@/versions/change";

export default async function CalendarDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const api = await serverApi();
  const [days, sessions] = await Promise.all([api.days.list(), orNotFound(api.days.sessions({ date }))]);
  return (
    <CalendarDayView date={date} days={days}>
      <ChangePoint at="calendar.beforeDay" props={{ date, sessions }} />
      <ChangePoint at="calendar.day" props={{ date, sessions }}>
        <DayList sessions={sessions} />
      </ChangePoint>
    </CalendarDayView>
  );
}
