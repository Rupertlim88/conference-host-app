import type { SessionDetail } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AddToCalendar } from "@/components/add-to-calendar";
import { InfoBox } from "@/components/info-box";
import { PageTitle } from "@/components/page-title";
import { TalkCard } from "@/components/talk-card";
import { cardLabel } from "@/lib/tones";

const H2 = "mb-1 text-lg font-semibold text-heading";

/** A session as the guide shows it: its abstract types, title, calendar and star, when and where, description, organizers, note, presentations and related types. */
export function SessionView({ session, star, note }: { session: SessionDetail; star: React.ReactNode; note: React.ReactNode }) {
  const t = useTranslations("session");
  const label = session.kind === "Session" ? `Session ${session.number}`.trim() : cardLabel(session.kind, session.number);
  const chairs = session.chairs.split("; ").filter(Boolean);
  return (
    <>
      <PageTitle eyebrow={session.tracks.map((track) => track.title).join(" and ")}>{label ? `${label} - ${session.title}` : session.title}</PageTitle>
      <div className="flex items-center justify-between">
        <AddToCalendar id={session.number || session.id} title={session.title} start={session.startsAt} end={session.endsAt} location={session.room} />
        {star}
      </div>
      <InfoBox start={session.startsAt} end={session.endsAt} room={session.room} building={session.building} />
      {session.description && (
        <section className="mb-5">
          <h2 className={H2}>{t("description")}</h2>
          <p className="text-sm whitespace-pre-line">{session.description}</p>
        </section>
      )}
      {chairs.length > 0 && (
        <section className="mb-5">
          <h2 className={H2}>{t("organizers")}</h2>
          <ul className="space-y-1 text-sm">
            {chairs.map((chair) => (
              <li key={chair}>{chair}</li>
            ))}
          </ul>
        </section>
      )}
      {note}
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
