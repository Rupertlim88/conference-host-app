// In our improvements, a session's page marks the talk to come for.
import type { AroundAbstract, AroundMatch, AroundPools, SessionDetail, TalkSummary } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

import { TalkCard } from "@/base/cards";
import { SessionTalks } from "@/base/session";
import { aroundAbstract } from "@/improvements/matches/matches";
import { Badge } from "@/shared/ui/badge";
import type { Change } from "@/versions/change";
import { GoldOutline } from "@/versions/gold";

/** In place of a session's list of talks, the same list with the talk to come for outlined in gold. */
export const sessionPicks: Change<"session.talks"> = {
  at: "session.talks",
  label: "sessionPicks",
  outlinesItself: true,
  render: async ({ session }, label) => <SessionPicksView session={session} around={await aroundAbstract()} label={label} />,
};

/** The talks the backend's pool for this session holds, as many as a session shows, that this page shows. */
export function bestMatchesIn(sessionId: string, talks: TalkSummary[], pools: AroundPools | null): AroundMatch[] {
  const ids = new Set(talks.map((talk) => talk.id));
  return (pools?.session.find((pool) => pool.id === sessionId)?.matches ?? []).filter((m) => ids.has(m.talk.id));
}

/** The session's talks in AMS's order, the first its pool lists outlined in gold where it sits; with no such talk, or
 *  no answer from the matching API, an empty gold box at the top of AMS's list. */
export function SessionPicksView({ session, around, label }: { session: SessionDetail; around: AroundAbstract; label: string }) {
  const t = useTranslations();
  const boxLabel = session.format === "Poster" ? t("improvements.sessionPicks.board") : label;
  const talks = around.layout ? (around.layout.find((laid) => laid.session.id === session.id)?.talks ?? []) : session.talks;
  const laidOutNote = around.layout && <GoldOutline label={t("versions.change.laidOut")} />;
  const best = new Map(bestMatchesIn(session.id, talks, around.pools).map((m) => [m.talk.id, m]));
  if (best.size === 0)
    return (
      <>
        {laidOutNote}
        <GoldOutline label={boxLabel} />
        <SessionTalks talks={talks} />
      </>
    );
  return (
    <div className="space-y-2">
      {laidOutNote}
      {talks.map((talk) => {
        const match = best.get(talk.id);
        return match ? (
          <GoldOutline key={talk.id} label={boxLabel}>
            <TalkCard talk={talk} />
            <p className="mt-1.5 text-xs">
              <Badge variant={match.kind === "unexpected" ? "default" : "secondary"}>{match.kind === "unexpected" ? t("related.unexpected") : t("related.core")}</Badge>
            </p>
            <p className="mt-1 text-xs">{t.rich("improvements.sessionPicks.why", { reason: match.reason, b: (words) => <b>{words}</b> })}</p>
          </GoldOutline>
        ) : (
          <TalkCard key={talk.id} talk={talk} />
        );
      })}
    </div>
  );
}
