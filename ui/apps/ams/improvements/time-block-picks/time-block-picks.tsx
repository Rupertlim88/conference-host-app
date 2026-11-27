// In our improvements, each time block of the Meeting Calendar starts with up to two sessions recommended around the demo's abstract.
import type { AroundAbstract, AroundPool, RelatedMatch, SessionSummary } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

import { DayList, TimeBlockSessions, timeBlocks, type TimeBlock } from "@/base/calendar";
import { SessionCard } from "@/base/cards";
import { aroundAbstract } from "@/improvements/matches/matches";
import { When } from "@/shared/meeting-time";
import { Badge } from "@/shared/ui/badge";
import type { Change } from "@/versions/change";
import { GoldOutline } from "@/versions/gold";

/** The Meeting Calendar's day with each time block opening with its gold outline: the block's start time as a heading,
 *  like AMS's own, then its recommendations, or nothing. Without the matching API's pools, every outline is empty and
 *  one gold note above the day says why. */
export function CalendarPicksView({ sessions, around, label }: { sessions: SessionSummary[]; around: AroundAbstract; label: string }) {
  const t = useTranslations("improvements.calendarPicks");
  const pools = around.abstract ? around.pools : null;
  const blocks = calendarBlocks(sessions, pools?.timeBlock ?? []);
  return (
    <>
      {!pools && (
        <GoldOutline label={label}>
          <p className="text-sm">{t(around.abstract ? "unavailable" : "noAbstract")}</p>
        </GoldOutline>
      )}
      {blocks.length === 0 ? (
        <DayList sessions={sessions} />
      ) : (
        blocks.map((block) => (
          <Fragment key={block.startsAt}>
            <GoldOutline label={label}>
              <h2 className="mb-2 text-center font-semibold text-heading">
                <When start={block.startsAt} mode="time" />
              </h2>
              {block.picks.length > 0 && (
                <ul className="space-y-3">
                  {block.picks.map((pick) => (
                    <PickItem key={pick.session.id} pick={pick} />
                  ))}
                </ul>
              )}
            </GoldOutline>
            {block.groups.map((group) => (
              <TimeBlockSessions key={`${group.startsAt}-${group.endsAt}`} block={group} />
            ))}
          </Fragment>
        ))
      )}
    </>
  );
}

/** In place of the Meeting Calendar's day, the day with each time block's recommendations at its top. */
export const timeBlockPicks: Change<"calendar.day"> = {
  at: "calendar.day",
  label: "calendarPicks",
  outlinesItself: true,
  render: async ({ sessions }, label) => (
    <CalendarPicksView sessions={sessions} around={await aroundAbstract()} label={label} />
  ),
};

/** A recommended session: its card, then the kind of match, when its related talk is, and why. */
function PickItem({ pick }: { pick: Recommendation }) {
  const t = useTranslations();
  return (
    <li>
      <SessionCard session={pick.session} />
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Badge variant={pick.kind === "unexpected" ? "default" : "secondary"}>{pick.kind === "unexpected" ? t("related.unexpected") : t("related.core")}</Badge>
        {pick.talkAt && (
          <>
            {" "}
            <span>{t.rich("improvements.calendarPicks.talkAt", { time: () => <When start={pick.talkAt} mode="time" /> })}</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{pick.reason}</p>
    </li>
  );
}

/** A session recommended at the top of its time block: the session of a talk the matching API lists in its pool for
 *  that block, for the fixed abstract. */
export interface Recommendation {
  session: SessionSummary;
  /** The kind and reason of the listed talk's match. */
  kind: RelatedMatch["kind"];
  reason: string;
  /** When the listed talk starts. */
  talkAt: string | null;
}

/** Every session that starts at one time: its recommendations, then AMS's groups for that time without them. */
export interface CalendarBlock {
  startsAt: string;
  picks: Recommendation[];
  /** AMS's groups that start then, in AMS's order, without the picked sessions; a group left empty is dropped. */
  groups: TimeBlock[];
}

/** A day's time blocks, earliest first, each with the sessions of the talks the backend's pool for that block holds, as
 *  many as a block shows, in the API's order. A talk whose session the calendar does not show in the block is left out. */
export function calendarBlocks(sessions: SessionSummary[], pools: AroundPool[]): CalendarBlock[] {
  const byStart: TimeBlock[][] = [];
  for (const group of timeBlocks(sessions)) {
    const last = byStart.at(-1);
    if (last?.[0]!.startsAt === group.startsAt) last.push(group);
    else byStart.push([group]);
  }
  return byStart.map((groups) => recommendIn(groups, pools));
}

/** One time block's picks from the pool that starts at the same instant, and AMS's groups without them. */
function recommendIn(groups: TimeBlock[], pools: AroundPool[]): CalendarBlock {
  const startsAt = groups[0]!.startsAt;
  const pool = pools.find((p) => Date.parse(p.id) === Date.parse(startsAt));
  const sessions = groups.flatMap((g) => g.sessions);
  const picks = (pool?.matches ?? [])
    .flatMap((m) => {
      const session = sessions.find((s) => s.id === m.talk.sessionId);
      return session ? [{ session, kind: m.kind, reason: m.reason, talkAt: m.talk.startsAt }] : [];
    });
  const picked = new Set(picks.map((p) => p.session.id));
  const rest = groups
    .map((g) => ({ ...g, sessions: g.sessions.filter((s) => !picked.has(s.id)) }))
    .filter((g) => g.sessions.length > 0);
  return { startsAt, picks, groups: rest };
}
