import type { Person } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";
import { byLetter } from "@/lib/people";
import { cn } from "@/lib/utils";

/** People A to Z by surname: a letter bar, then the chosen letter's people (the first letter until one is chosen). */
export function PeopleView({ people, letter }: { people: Person[]; letter: string | undefined }) {
  const t = useTranslations("people");
  const groups = byLetter(people);
  const current = groups.find((g) => g.letter === letter) ?? groups[0];
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <nav className="mb-4 flex flex-wrap justify-center gap-1">
        {groups.map((g) => (
          <Link
            key={g.letter}
            href={`/people?letter=${encodeURIComponent(g.letter)}`}
            aria-label={t("letter", { letter: g.letter })}
            aria-current={g.letter === current?.letter ? "page" : undefined}
            className={cn(
              "flex size-8 items-center justify-center rounded text-sm text-heading",
              g.letter === current?.letter ? "bg-heading text-white" : "hover:bg-primary/5",
            )}
          >
            {g.letter}
          </Link>
        ))}
      </nav>
      <ul className="divide-y rounded-md border">
        {current?.people.map((p) => (
          <li key={p.id}>
            <Link href={`/people/${p.id}`} className="block px-4 py-2.5 text-sm hover:bg-primary/5">
              <span className="text-primary">{p.name}</span>{" "}
              {p.affiliation && <span className="block text-xs text-muted-foreground">{p.affiliation}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
