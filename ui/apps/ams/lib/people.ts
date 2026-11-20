import type { Person } from "@repo/host-contracts";

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
