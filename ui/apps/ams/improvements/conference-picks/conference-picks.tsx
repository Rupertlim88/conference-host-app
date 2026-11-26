// In our improvements, Conferences and Symposia puts first the other conferences that hold a talk for the attendee's abstract, each with that talk and its reason.
import type { AroundAbstract, AroundMatch, Track } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { aroundAbstract } from "@/improvements/matches/matches";
import { When } from "@/shared/meeting-time";
import { Badge } from "@/shared/ui/badge";
import type { Change } from "@/versions/change";
import { GoldOutline } from "@/versions/gold";

/** In place of the conferences list, the other conferences ranked for the abstract in a gold box, then the rest in AMS's
 *  order. */
export const conferencePicks: Change<"programmes.list"> = {
  at: "programmes.list",
  label: "conferencePicks",
  outlinesItself: true,
  render: async ({ tracks }, label) => <ConferencePicksView tracks={tracks} around={await aroundAbstract()} label={label} />,
};

/** A conference that holds a match for the abstract, with its best talk. */
export interface ConferencePick {
  track: Track;
  best: AroundMatch;
}

/** The conferences ranked for the abstract: each other conference the matching API lists a pool for, with the first
 *  talk its pool lists, the better of those talks first, ties in AMS's order; then every other conference in AMS's
 *  order, the attendee's own marked. */
export function rankConferences(tracks: Track[], around: AroundAbstract): { picks: ConferencePick[]; rest: { track: Track; own: boolean }[] } {
  const own = new Set(around.abstractTrackIds);
  const pools = new Map((around.pools?.subConference ?? []).map((pool) => [pool.id, pool.matches[0]!]));
  const picks = tracks
    .filter((track) => !own.has(track.id))
    .flatMap((track) => {
      const best = pools.get(track.id);
      return best ? [{ track, best }] : [];
    })
    .sort((a, b) => b.best.score - a.best.score);
  const picked = new Set(picks.map((p) => p.track.id));
  return { picks, rest: tracks.filter((track) => !picked.has(track.id)).map((track) => ({ track, own: own.has(track.id) })) };
}

/** Conferences and Symposia's list: a gold box at the top with the other conferences ranked for the demo's abstract,
 *  empty with none, or one line when there is no answer; then AMS's order. */
export function ConferencePicksView({ tracks, around, label }: { tracks: Track[]; around: AroundAbstract; label: string }) {
  const t = useTranslations("improvements.conferencePicks");
  const { picks, rest } = rankConferences(tracks, around);
  const abstract = around.abstract;
  return (
    <>
      <GoldOutline label={label}>
        {!abstract || !around.pools ? (
          <p className="text-sm">{t(abstract ? "unavailable" : "noAbstract")}</p>
        ) : (
          picks.length > 0 && (
            <>
              <p className="mb-3 text-sm">
                {t.rich("pickedFor", { abstract: [abstract.number, abstract.title].filter(Boolean).join(" "), b: (words) => <b>{words}</b> })}
              </p>
              <ul className="space-y-2">
                {picks.map((pick) => (
                  <PickItem key={pick.track.id} pick={pick} />
                ))}
              </ul>
            </>
          )
        )}
      </GoldOutline>
      {picks.length > 0 && <h2 className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">{t("rest")}</h2>}
      <ul className="divide-y rounded-md border">
        {rest.map(({ track, own }) => (
          <li key={track.id}>
            <Link href={`/programs/${track.id}`} className="block px-4 py-3 text-sm text-primary hover:bg-primary/5">
              {track.title}
              {own && (
                <>
                  {" "}
                  <Badge variant="outline" className="ml-1 border-amber-400 bg-amber-50 text-amber-950">
                    {t("yours")}
                  </Badge>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** A conference ranked for the abstract: its name, then its best talk, the kind of match, when it is, and why. */
function PickItem({ pick: { track, best } }: { pick: ConferencePick }) {
  const t = useTranslations();
  return (
    <li className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm">
      <Link href={`/programs/${track.id}`} className="font-semibold text-primary">
        {track.title}
      </Link>
      <Link href={`/talks/${best.talk.id}`} className="mt-1 block text-heading hover:underline">
        {best.talk.number && <span className="font-semibold">{best.talk.number}</span>} {best.talk.title}
      </Link>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <Badge variant={best.kind === "unexpected" ? "default" : "secondary"}>{best.kind === "unexpected" ? t("related.unexpected") : t("related.core")}</Badge>{" "}
        {best.talk.startsAt && (
          <span>
            <When start={best.talk.startsAt} mode="date" /> · <When start={best.talk.startsAt} mode="time" />
          </span>
        )}
      </p>
      <p className="mt-1 text-xs">{t.rich("improvements.why", { reason: best.reason, b: (words) => <b>{words}</b> })}</p>
    </li>
  );
}
