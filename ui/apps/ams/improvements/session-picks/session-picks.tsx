// In our improvements, a session's page marks the talk to come for.
import { SHOWN_PER_PLACE, type AroundAbstract, type AroundMatch, type AroundPools, type SessionDetail } from "@repo/host-contracts";
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

/** The first talks the matching API lists in this session's pool that the session shows, as many as a session shows. */
export function bestMatchesIn(session: SessionDetail, pools: AroundPools | null): AroundMatch[] {
  const ids = new Set(session.talks.map((talk) => talk.id));
  const listed = pools?.session.find((pool) => pool.id === session.id)?.matches ?? [];
  return listed.filter((m) => ids.has(m.talk.id)).slice(0, SHOWN_PER_PLACE.session);
}

/** The session's talks in AMS's order, the first its pool lists outlined in gold where it sits; with no such talk, or
 *  no answer from the matching API, an empty gold box at the top of AMS's list. */
export function SessionPicksView({ session, around, label }: { session: SessionDetail; around: AroundAbstract; label: string }) {
  const t = useTranslations();
  const boxLabel = session.format === "Poster" ? t("improvements.sessionPicks.board") : label;
  const best = new Map(bestMatchesIn(session, around.pools).map((m) => [m.talk.id, m]));
  if (best.size === 0)
    return (
      <>
        <GoldOutline label={boxLabel} />
        <SessionTalks talks={session.talks} />
      </>
    );
  return (
    <div className="space-y-2">
      {session.talks.map((talk) => {
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
