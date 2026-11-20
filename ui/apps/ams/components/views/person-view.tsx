import type { PersonDetail } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";
import { TalkCard } from "@/components/talk-card";

/** One person: name under affiliation, then their presentations. */
export function PersonView({ person }: { person: PersonDetail }) {
  const t = useTranslations("people");
  return (
    <>
      <PageTitle eyebrow={person.affiliation}>{person.name}</PageTitle>
      <h2 className="mb-2 text-lg font-semibold text-heading">{t("talks")}</h2>
      <div className="space-y-2">
        {person.talks.map((talk) => (
          <TalkCard key={talk.id} talk={talk} />
        ))}
      </div>
    </>
  );
}
