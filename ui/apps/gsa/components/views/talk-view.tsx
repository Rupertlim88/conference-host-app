import type { TalkDetail } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AddToCalendar } from "@/components/add-to-calendar";
import { InfoBox } from "@/components/info-box";

/** An abstract, as GSA publishes it: number and title, session, calendar and star, when and where, authors, abstract, DOI, citation, then the note and the related talks. */
export function TalkView({ talk, star, note, related }: { talk: TalkDetail; star: React.ReactNode; note: React.ReactNode; related: React.ReactNode }) {
  const t = useTranslations("talk");
  const paragraphs = talk.abstract.split("\n\n").filter(Boolean);
  return (
    <>
      <h1 className="mb-2 text-2xl leading-snug font-light">{talk.number ? `${talk.number} ${talk.title}` : talk.title}</h1>
      {talk.session && (
        <p className="mb-3 text-sm">
          <span className="font-semibold">{t("session")}: </span>
          <Link href={`/sessions/${talk.session.id}`} className="text-primary underline">
            {talk.session.title}
          </Link>
        </p>
      )}
      <div className="flex items-center justify-between">
        <AddToCalendar id={talk.number || talk.id} title={talk.title} start={talk.startsAt} end={talk.endsAt} location={talk.room} />
        {star}
      </div>
      <InfoBox start={talk.startsAt} end={talk.endsAt} room={talk.room} building={talk.building} />
      {talk.booth && <p className="mb-3 text-sm">{t("booth", { booth: talk.booth })}</p>}
      <section className="mb-4">
        <h2 className="text-lg font-semibold">{t("authors")}</h2>
        {talk.presentingAuthor && <p className="text-sm">{talk.presentingAuthor}</p>}
        {talk.authorLine && <p className="text-sm text-muted-foreground">{talk.authorLine}</p>}
        {talk.affiliations.length > 0 && (
          <ul className="mt-1 text-xs text-muted-foreground">
            {talk.affiliations.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="mb-4">
        <h2 className="text-lg font-semibold">{t("abstract")}</h2>
        {paragraphs.length > 0 ? (
          <div className="space-y-3 text-[15px] leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noAbstract")}</p>
        )}
      </section>
      {talk.doi && (
        <p className="mb-2 text-sm">
          {t("doi")}:{" "}
          <a href={`https://doi.org/${talk.doi}`} className="text-primary underline" rel="noreferrer" target="_blank">
            {talk.doi}
          </a>
        </p>
      )}
      {talk.citation && <p className="mb-4 text-xs text-muted-foreground">{talk.citation}</p>}
      {note}
      {related}
    </>
  );
}
