// In our improvements, a session's page marks the talk to come for.
import type { AroundAbstract, AroundMatch, SessionDetail, TalkSummary } from "@repo/host-contracts";
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

/** The best of the abstract's matches among these talks, or none. */
export function bestMatchIn(talks: TalkSummary[], matches: AroundMatch[]): AroundMatch | undefined {
  const ids = new Set(talks.map((talk) => talk.id));
  return matches.filter((m) => ids.has(m.talk.id)).reduce<AroundMatch | undefined>((best, m) => (!best || m.score > best.score ? m : best), undefined);
}

/** The session's talks in AMS's order, the one holding the best match for the abstract outlined in gold where it sits;
 *  with no such talk, or no answer from the matching API, AMS's list as it is. */
export function SessionPicksView({ session, around, label }: { session: SessionDetail; around: AroundAbstract; label: string }) {
  const t = useTranslations();
  const best = bestMatchIn(session.talks, around.matches ?? []);
  if (!best) return <SessionTalks talks={session.talks} />;
  return (
    <div className="space-y-2">
      {session.talks.map((talk) =>
        talk.id === best.talk.id ? (
          <GoldOutline key={talk.id} label={session.format === "Poster" ? t("improvements.sessionPicks.board") : label}>
            <TalkCard talk={talk} />
            <p className="mt-1.5 text-xs">
              <Badge variant={best.kind === "unexpected" ? "default" : "secondary"}>{best.kind === "unexpected" ? t("related.unexpected") : t("related.core")}</Badge>
            </p>
            <p className="mt-1 text-xs">{t.rich("improvements.sessionPicks.why", { reason: best.reason, b: (words) => <b>{words}</b> })}</p>
          </GoldOutline>
        ) : (
          <TalkCard key={talk.id} talk={talk} />
        ),
      )}
    </div>
  );
}
