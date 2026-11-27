// The demo carries a sample: every track and session, with five talks with an abstract from each track.
import type { SocietyRows, TalkRow } from "./load";

/** How many talks with an abstract each track keeps. */
export const SAMPLE_SIZE = 5;

const highlighted = (t: TalkRow) => t.coreKeynote || t.newFellow || t.supplementary;
const inTimeOrder = (a: TalkRow, b: TalkRow) =>
  (a.startsAt?.getTime() ?? Infinity) - (b.startsAt?.getTime() ?? Infinity) || a.sort - b.sort || a.id.localeCompare(b.id);

/** Up to `n` of these items, spread evenly from the first through the list. */
function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, k) => items[Math.floor((k * items.length) / n)]!);
}

/** The sample's talks: five talks with an abstract from each track, spread evenly through its talks in time order, so
 *  that every day of the meeting holds some. A talk counts for every track it is in, so a track already holding five
 *  from other tracks keeps no more. Breaks and the talks on Program Highlights' lists are always kept, and count
 *  against no track. Loading keeps every track and session beside them. */
export function sampleTalkIds(rows: SocietyRows): string[] {
  const kept = new Set(rows.talks.filter((t) => t.kind === "break" || highlighted(t)).map((t) => t.id));
  const eligible = rows.talks.filter((t) => !kept.has(t.id) && t.abstract !== "").sort(inTimeOrder);
  for (const track of rows.tracks) {
    const inTrack = eligible.filter((t) => t.trackIds.includes(track.id));
    const already = inTrack.filter((t) => kept.has(t.id)).length;
    const open = inTrack.filter((t) => !kept.has(t.id));
    for (const t of spread(open, Math.max(0, SAMPLE_SIZE - already))) kept.add(t.id);
  }
  return rows.talks.filter((t) => kept.has(t.id)).map((t) => t.id);
}
