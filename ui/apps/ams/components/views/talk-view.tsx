import type { TalkDetail } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { InfoBox } from "@/components/info-box";
import { PageTitle } from "@/components/page-title";

/** A talk as the meeting app shows it: title, star, when and where, authors, abstract, related talks, session and citation. */
export function TalkView({ talk, star, related }: { talk: TalkDetail; star: React.ReactNode; related: React.ReactNode }) {
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
      {related}
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
