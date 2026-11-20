import type { SearchResults } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";
import { SearchBox } from "@/components/search-box";
import { SessionCard } from "@/components/session-card";
import { TalkCard } from "@/components/talk-card";

/** Search: the box, then people, sessions and presentations that match. results is null when the query was too short to run. */
export function SearchView({ q, results }: { q: string; results: SearchResults | null }) {
  const t = useTranslations("search");
  const nothing = results !== null && results.people.length + results.sessions.length + results.talks.length === 0;
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <SearchBox initial={q} />
      {q && results === null && <p className="text-sm text-muted-foreground">{t("hint")}</p>}
      {nothing && <p className="text-sm">{t("nothing", { q })}</p>}
      {results && results.people.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("people")}</h2>
          <ul className="space-y-1">
            {results.people.map((p) => (
              <li key={p.id}>
                <Link href={`/people/${p.id}`} className="text-sm text-primary underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {results && results.sessions.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("sessions")}</h2>
          <div className="space-y-2">
            {results.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}
      {results && results.talks.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("talks")}</h2>
          <div className="space-y-2">
            {results.talks.map((talk) => (
              <TalkCard key={talk.id} talk={talk} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
