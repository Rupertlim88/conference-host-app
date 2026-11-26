// In our improvements, each time block of the Meeting Calendar starts with up to two sessions recommended around the demo's abstract.
import type { AroundAbstract, RelatedMatch, SessionSummary } from "@repo/host-contracts";
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
 *  like AMS's own, then its recommendations, or nothing. Without the abstract's matches, every outline is empty and
 *  one gold note above the day says why. */
export function CalendarPicksView({ sessions, around, label }: { sessions: SessionSummary[]; around: AroundAbstract; label: string }) {
  const t = useTranslations("improvements.calendarPicks");
  const matches = around.abstract ? around.matches : null;
  const blocks = calendarBlocks(sessions, matches ?? []);
  return (
    <>
      {!matches && (
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

/** A recommended session: its card, then the kind of match, how many related talks, when the first is, and why. */
function PickItem({ pick }: { pick: Recommendation }) {
  const t = useTranslations();
  return (
    <li>
      <SessionCard session={pick.session} />
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Badge variant={pick.kind === "unexpected" ? "default" : "secondary"}>{pick.kind === "unexpected" ? t("related.unexpected") : t("related.core")}</Badge>{" "}
        <span>{t("improvements.matches", { count: pick.related })}</span>
        {pick.firstTalkAt && (
          <>
            {" "}
            <span>{t.rich("improvements.calendarPicks.firstTalk", { time: () => <When start={pick.firstTalkAt} mode="time" /> })}</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{pick.reason}</p>
    </li>
  );
}

/** How many sessions a time block recommends at most. */
const MOST_PICKS = 2;

/** A session recommended at the top of its time block, from the matching API's matches for the fixed abstract in it. */
export interface Recommendation {
  session: SessionSummary;
  /** How many of the abstract's matches the session holds. */
  related: number;
  /** The kind, reason and score of its best match. */
  kind: RelatedMatch["kind"];
  reason: string;
  score: number;
  /** When its first related talk starts. */
  firstTalkAt: string | null;
}

/** Every session that starts at one time: its recommendations, then AMS's groups for that time without them. */
export interface CalendarBlock {
  startsAt: string;
  picks: Recommendation[];
  /** AMS's groups that start then, in AMS's order, without the picked sessions; a group left empty is dropped. */
  groups: TimeBlock[];
}

/** A day's time blocks, earliest first, each with up to two sessions holding the abstract's matches: the session with
 *  more related talks first, then the better score, ties in AMS's order. Matches outside the day's sessions are left out. */
export function calendarBlocks(sessions: SessionSummary[], matches: RelatedMatch[]): CalendarBlock[] {
  const byStart: TimeBlock[][] = [];
  for (const group of timeBlocks(sessions)) {
    const last = byStart.at(-1);
    if (last?.[0]!.startsAt === group.startsAt) last.push(group);
    else byStart.push([group]);
  }
  return byStart.map((groups) => recommendIn(groups, matches));
}

/** One time block's picks, and AMS's groups without them. */
function recommendIn(groups: TimeBlock[], matches: RelatedMatch[]): CalendarBlock {
  const picks = groups
    .flatMap((g) => g.sessions)
    .flatMap((session) => {
      const found = matches.filter((m) => m.talk.sessionId === session.id);
      return found.length > 0 ? [recommend(session, found)] : [];
    })
    .sort((a, b) => b.related - a.related || b.score - a.score)
    .slice(0, MOST_PICKS);
  const picked = new Set(picks.map((p) => p.session.id));
  const rest = groups
    .map((g) => ({ ...g, sessions: g.sessions.filter((s) => !picked.has(s.id)) }))
    .filter((g) => g.sessions.length > 0);
  return { startsAt: groups[0]!.startsAt, picks, groups: rest };
}

/** A session's recommendation from its matches: how many, the best one's kind, reason and score, the earliest time. */
function recommend(session: SessionSummary, found: RelatedMatch[]): Recommendation {
  const best = found.reduce((a, b) => (b.score > a.score ? b : a));
  const times = found.flatMap((m) => (m.talk.startsAt ? [m.talk.startsAt] : [])).sort();
  return { session, related: found.length, kind: best.kind, reason: best.reason, score: best.score, firstTalkAt: times[0] ?? null };
}
