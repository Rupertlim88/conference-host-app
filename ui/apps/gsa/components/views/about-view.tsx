import type { Meeting } from "@repo/host-contracts";
import { useFormatter } from "next-intl";

import { PageTitle } from "@/components/page-title";

const day = (date: string) => new Date(`${date}T12:00:00Z`);

/** About GSA Connects: the meeting, its dates and place, and what it is. */
export function AboutView({ meeting }: { meeting: Meeting }) {
  const format = useFormatter();
  return (
    <>
      <PageTitle>{meeting.name}</PageTitle>
      <p className="mb-2">{format.dateTimeRange(day(meeting.startsOn), day(meeting.endsOn), { dateStyle: "long", timeZone: "UTC" })}</p>
      <p className="mb-4 text-muted-foreground">
        {meeting.venue}, {meeting.city}
      </p>
      <p className="leading-relaxed">{meeting.about}</p>
    </>
  );
}
