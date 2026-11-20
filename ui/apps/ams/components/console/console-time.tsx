import { useFormatter, useTranslations } from "next-intl";

import { MEETING_ZONE } from "@/lib/meeting";

/** A time in the console, always in the meeting's zone, since the session form reads times that way:
 *  "Tue, Jan 27, 1:45 PM - 3:00 PM". */
export function ConsoleTime({ start, end }: { start: string | null; end?: string | null }) {
  const format = useFormatter();
  const t = useTranslations("console");
  if (!start) return <>{t("noTime")}</>;
  const day = format.dateTime(new Date(start), { weekday: "short", month: "short", day: "numeric", timeZone: MEETING_ZONE });
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "numeric", minute: "2-digit", timeZone: MEETING_ZONE });
  return <>{`${day}, ${time(start)}${end ? ` - ${time(end)}` : ""}`}</>;
}
