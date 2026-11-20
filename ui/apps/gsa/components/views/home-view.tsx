import type { Meeting } from "@repo/host-contracts";
import { CalendarDays, MapPin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

const day = (date: string) => new Date(`${date}T12:00:00Z`);

/** Guidebook's guide home: a city picture, the meeting's name and dates, details and location. */
export function HomeView({ meeting }: { meeting: Meeting }) {
  const t = useTranslations("home");
  const format = useFormatter();
  return (
    <>
      <svg viewBox="0 0 400 140" className="mb-4 w-full rounded-xl" role="img" aria-label={meeting.city}>
        <rect width="400" height="140" fill="#2f8f7a" />
        <path d="M0 90l60-40 50 30 70-55 60 45 50-30 110 60v40H0z" fill="#1f6f5e" />
        <path d="M0 110l80-30 60 20 80-35 70 30 110-20v65H0z" fill="#185848" />
        <path d="M30 140v-40h20v-25h15v25h25v-55h18v55h22v-30h16v70zM250 140v-60h20v-20h12v20h18v60zM320 140v-45h25v45z" fill="#123f35" />
      </svg>
      <h1 className="mb-2 text-3xl font-light">{meeting.name}</h1>
      <p className="mb-6 flex items-center gap-2 text-base">
        <CalendarDays className="size-4" aria-hidden />
        {format.dateTimeRange(day(meeting.startsOn), day(meeting.endsOn), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
      </p>
      <h2 className="mb-2 text-2xl font-semibold">{t("details")}</h2>
      <p className="mb-6 text-[15px] leading-relaxed">{t("intro")}</p>
      <h2 className="mb-2 text-2xl font-semibold">{t("location")}</h2>
      <p className="flex items-start gap-2 rounded-xl border p-4 text-[15px]">
        <MapPin className="mt-0.5 size-5 text-primary" aria-hidden />
        <span>
          <span>{meeting.venue}</span>{" "}
          <br />
          <span className="text-muted-foreground">{meeting.city}</span>
        </span>
      </p>
    </>
  );
}
