// A session's page shows its time, place, chairs and talks.
import type { SessionDetail } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

import { cardLabel, InfoBox, TalkCard } from "@/features/cards";
import { PageTitle } from "@/features/frame";

/** A session as the meeting app shows it: its conferences, title, star, when and where, description, organizers, presentations and related conferences. */
export function SessionView({ session, star }: { session: SessionDetail; star: React.ReactNode }) {
  const t = useTranslations("session");
  const format = useFormatter();
  // A plain session is titled by its kind, as AMS names it, and its number: "Session 5".
  const label = session.kind === "Session" ? [session.kind, session.number].filter(Boolean).join(" ") : cardLabel(session.kind, session.number);
  const chairs = session.chairs.split("; ").filter(Boolean);
  return (
    <>
      <PageTitle eyebrow={format.list(session.tracks.map((track) => track.title), { type: "conjunction" })}>{label ? `${label} - ${session.title}` : session.title}</PageTitle>
      <div className="flex justify-end">{star}</div>
      <InfoBox start={session.startsAt} end={session.endsAt} room={session.room} building={session.building} />
      {session.description && (
        <section className="mb-5">
          <h2 className="mb-1 text-lg font-semibold text-heading">{t("description")}</h2>
          <p className="text-sm whitespace-pre-line">{session.description}</p>
        </section>
      )}
      {chairs.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-1 text-lg font-semibold text-heading">{t("organizers")}</h2>
          <ul className="space-y-1 text-sm">
            {chairs.map((chair) => (
              <li key={chair}>{chair}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="mb-5">
        <h2 className="mb-2 text-lg font-semibold text-heading">{t("presentations")}</h2>
        {session.talks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <div className="space-y-2">
            {session.talks.map((talk) => (
              <TalkCard key={talk.id} talk={talk} />
            ))}
          </div>
        )}
      </section>
      {session.tracks.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("related")}</h2>
          <ul className="space-y-2">
            {session.tracks.map((track) => (
              <li key={track.id}>
                <Link href={`/programs/${track.id}`} className="block border-l-4 border-neutral-200 px-3 py-2 text-sm text-primary">
                  {track.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
