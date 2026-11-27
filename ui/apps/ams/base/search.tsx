// Search finds talks, sessions and people from two to a hundred characters.
import { SearchInputSchema, type SearchResults } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import Form from "next/form";
import Link from "next/link";

import { SessionCard, TalkCard } from "@/base/cards";
import { PageTitle } from "@/shared/marks";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

/** The longest query the backend searches. */
const LONGEST = SearchInputSchema.shape.q.maxLength!;

/** Search: the box, then people, sessions and presentations that match. results is null when the query was too short or too long to run. */
export function SearchView({ q, results }: { q: string; results: SearchResults | null }) {
  const t = useTranslations("search");
  const nothing = results !== null && results.people.length + results.sessions.length + results.talks.length === 0;
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <SearchBox initial={q} />
      {q && results === null && <p className="text-sm text-muted-foreground">{t(q.trim().length > LONGEST ? "tooLong" : "hint")}</p>}
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

/** The search form. A plain GET to /search, which next/form turns into a client-side visit. */
export function SearchBox({ initial }: { initial: string }) {
  const t = useTranslations("search");
  return (
    <Form action="/search" role="search" className="mb-5 flex gap-2">
      <Input name="q" defaultValue={initial} placeholder={t("placeholder")} aria-label={t("placeholder")} />
      <Button type="submit">{t("submit")}</Button>
    </Form>
  );
}
