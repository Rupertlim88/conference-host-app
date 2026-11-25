import type { Person, PersonDetail } from "@repo/host-contracts";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { TalkCard } from "@/features/cards";
import { PageTitle } from "@/features/frame";
import { cn } from "@/features/ui/utils";

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

export const surnameOf = (name: string) => name.trim().split(/\s+/).at(-1) ?? name;

const letterOf = (name: string) => {
  const first = surnameOf(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
};

/** People grouped A to Z by the first letter of their surname; anything else goes under #, last. */
export function byLetter(people: Person[]): { letter: string; people: Person[] }[] {
  const groups = new Map<string, Person[]>();
  for (const p of people) groups.set(letterOf(p.name), [...(groups.get(letterOf(p.name)) ?? []), p]);
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
    .map(([letter, list]) => ({
      letter,
      people: list.sort((x, y) => surnameOf(x.name).localeCompare(surnameOf(y.name)) || x.name.localeCompare(y.name)),
    }));
}
