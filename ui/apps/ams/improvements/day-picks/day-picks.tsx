// In our improvements, each day of the Meeting Calendar starts with the attendee's best talks that day.
import { SHOWN_PER_PLACE, type AroundAbstract, type AroundMatch, type AroundPools } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

import { aroundAbstract, calendarScope } from "@/improvements/matches/matches";
import { When } from "@/shared/meeting-time";
import { Badge } from "@/shared/ui/badge";
import type { Change } from "@/versions/change";
import { GoldOutline } from "@/versions/gold";

/** Above the Meeting Calendar's day, the day's best talks for the abstract. */
export const dayPicks: Change<"calendar.beforeDay"> = {
  at: "calendar.beforeDay",
  label: "dayPicks",
  outlinesItself: true,
  render: async ({ date, sessions }, label) => <DayPicksView date={date} around={await aroundAbstract(calendarScope(date, sessions))} label={label} />,
};

/** The first three talks the matching API lists in its pool for this day, which holds one talk from each session, the
 *  better score first; never padded. */
export function picksOn(date: string, pools: AroundPools): AroundMatch[] {
  return (pools.day.find((pool) => pool.id === date)?.matches ?? []).slice(0, SHOWN_PER_PLACE.day);
}

/** The day's best talks for the abstract in a gold outline, empty on a day with none; one line when the matching API
 *  cannot answer or the demo has no abstract. */
export function DayPicksView({ date, around, label }: { date: string; around: AroundAbstract; label: string }) {
  const t = useTranslations("improvements.dayPicks");
  const format = useFormatter();
  if (!around.abstract || !around.pools) {
    return (
      <GoldOutline label={label}>
        <p className="text-sm">{t(around.abstract ? "unavailable" : "noAbstract")}</p>
      </GoldOutline>
    );
  }
  const picks = picksOn(date, around.pools);
  return (
    <GoldOutline label={label}>
      {picks.length > 0 && (
        <>
          <p className="mb-2 text-xs">{t("pickedFor", { day: format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "long", timeZone: "UTC" }) })}</p>
          <ul className="space-y-2">
            {picks.map((pick) => (
              <PickItem key={pick.talk.id} pick={pick} />
            ))}
          </ul>
        </>
      )}
    </GoldOutline>
  );
}

/** A talk picked for the day: when it starts, its number and title, the kind of match, its conference, and why. */
function PickItem({ pick }: { pick: AroundMatch }) {
  const t = useTranslations();
  const format = useFormatter();
  return (
    <li className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm">
      <p className="font-semibold text-heading">
        <When start={pick.talk.startsAt} mode="time" />
      </p>
      <Link href={`/talks/${pick.talk.id}`} className="mt-0.5 block text-primary hover:underline">
        {pick.talk.number && <span className="font-semibold">{pick.talk.number}</span>} {pick.talk.title}
      </Link>
      <p className="mt-1.5 text-xs">
        <Badge variant={pick.kind === "unexpected" ? "default" : "secondary"}>{pick.kind === "unexpected" ? t("related.unexpected") : t("related.core")}</Badge>
      </p>
      {pick.tracks.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{format.list(pick.tracks.map((track) => track.title), { type: "conjunction" })}</p>
      )}
      <p className="mt-1 text-xs">{t.rich("improvements.why", { reason: pick.reason, b: (words) => <b>{words}</b> })}</p>
    </li>
  );
}
