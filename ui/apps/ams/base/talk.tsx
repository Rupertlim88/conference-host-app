// A talk's page shows everything the programme publishes about it.
import type { TalkDetail } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { PageTitle } from "@/shared/marks";
import { InfoBox } from "@/base/cards";

/** A talk as the meeting app shows it: title, star, when and where, authors, abstract, session and citation. What our
 *  versions add after the abstract comes in `afterAbstract`. */
export function TalkView({ talk, star, afterAbstract }: { talk: TalkDetail; star: React.ReactNode; afterAbstract: React.ReactNode }) {
  const t = useTranslations("talk");
  const paragraphs = talk.abstract.split("\n\n").filter(Boolean);
  return (
    <>
      <PageTitle>{talk.number ? `${talk.number} - ${talk.title}` : talk.title}</PageTitle>
      <div className="flex justify-end">{star}</div>
      <InfoBox start={talk.startsAt} end={talk.endsAt} room={talk.room} building={talk.building} />
      {talk.booth && <p className="mb-3 text-sm">{t("booth", { booth: talk.booth })}</p>}
      {talk.authorLine && <p className="mb-4 text-sm italic">{talk.authorLine}</p>}
      <section className="mb-5">
        <h2 className="mb-1 text-lg font-semibold text-heading">{t("abstract")}</h2>
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
      {afterAbstract}
      {talk.session && (
        <p className="text-sm">
          {t("session")}:{" "}
          <Link href={`/sessions/${talk.session.id}`} className="text-primary underline">
            {talk.session.number ? `${talk.session.number} - ${talk.session.title}` : talk.session.title}
          </Link>
        </p>
      )}
      {talk.citation && (
        <section className="mt-5 text-xs text-muted-foreground">
          <h2 className="font-semibold">{t("citation")}</h2>
          <p>{talk.citation}</p>
        </section>
      )}
    </>
  );
}
