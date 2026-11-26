// The demo carries a sample: every track and session, with five talks with an abstract from each track.
import type { SocietyRows, TalkRow } from "./load";

/** How many talks with an abstract each track keeps. */
export const SAMPLE_SIZE = 5;

const highlighted = (t: TalkRow) => t.coreKeynote || t.newFellow || t.supplementary;
const inTimeOrder = (a: TalkRow, b: TalkRow) =>
  (a.startsAt?.getTime() ?? Infinity) - (b.startsAt?.getTime() ?? Infinity) || a.sort - b.sort || a.id.localeCompare(b.id);

/** Every track, session and page of names, with the first five talks with an abstract in each track, in time order.
 *  A talk counts for every track it is in. Breaks and the talks on Program Highlights' lists are always kept, and count
 *  against no track. People stay only with a talk that stays. */
export function sampleRows(rows: SocietyRows): SocietyRows {
  const counts = new Map<string, number>();
  const kept = new Set<string>();
  for (const t of [...rows.talks].sort(inTimeOrder)) {
    if (t.kind === "break" || highlighted(t)) {
      kept.add(t.id);
      continue;
    }
    if (!t.abstract || !t.trackIds.some((track) => (counts.get(track) ?? 0) < SAMPLE_SIZE)) continue;
    kept.add(t.id);
    for (const track of t.trackIds) counts.set(track, (counts.get(track) ?? 0) + 1);
  }
  const talkPeople = rows.talkPeople.filter((tp) => kept.has(tp.talkId));
  const people = new Set(talkPeople.map((tp) => tp.personId));
  return {
    ...rows,
    talks: rows.talks.filter((t) => kept.has(t.id)),
    talkPeople,
    people: rows.people.filter((p) => people.has(p.id)),
  };
}
