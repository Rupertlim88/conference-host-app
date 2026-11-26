// The programme map lists every time block, session and conference of AMS's whole published programme, with its talks.
import { ProgrammeMapSchema, type ProgrammeMap } from "@repo/host-contracts";
import type { WholeProgramme, WholeProgrammeStore, WholeTalk } from "@repo/host-store";

import { plain } from "./tester-token";

/** 2027-01-11T08:30:00-07:00 on the meeting's clock as 2027-01-11T08:30. */
const toMinute = (start: string | null) => (start ? start.slice(0, 16) : null);

const byStart = (a: { start: string | null; id: string }, b: { start: string | null; id: string }) =>
  (a.start ?? "￿").localeCompare(b.start ?? "￿") || a.id.localeCompare(b.id);

/** The whole programme's talks, breaks left out, as the map lists them: each session's talks in its order, sessions
 *  earliest first, then the talks in no session. */
export function programmeMap(whole: WholeProgramme, conference: string): ProgrammeMap {
  const talks = whole.talks.filter((t) => t.kind !== "break");
  const sessionsById = new Map(whole.sessions.map((s) => [s.id, s]));
  const inSession = new Map<string, WholeTalk[]>();
  for (const talk of talks) {
    if (talk.sessionId && sessionsById.has(talk.sessionId)) inSession.set(talk.sessionId, [...(inSession.get(talk.sessionId) ?? []), talk]);
  }

  const sessions = whole.sessions
    .filter((s) => inSession.has(s.id))
    .map((s) => ({ id: s.id, start: toMinute(s.start), talks: inSession.get(s.id)!.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id)) }))
    .sort(byStart);

  const timeBlocks: ProgrammeMap["timeBlocks"] = [];
  for (const session of sessions) {
    if (!session.start) continue;
    const block = timeBlocks.at(-1);
    if (block?.start === session.start) block.sessions.push(session.id);
    else timeBlocks.push({ start: session.start, sessions: [session.id] });
  }

  // A talk is listed only under its own conferences, as the report's places and the matching API's pools count it,
  // even when its joint session names more.
  const placed = sessions.flatMap((s) => s.talks);
  const placedIds = new Set(placed.map((t) => t.id));
  const loose = talks.filter((t) => !placedIds.has(t.id)).sort((a, b) => a.id.localeCompare(b.id));
  const ordered = [...placed, ...loose];
  const conferences = whole.tracks
    .map((track) => ({ trackId: track.id, title: track.title, talks: ordered.filter((t) => t.trackIds.includes(track.id)).map((t) => t.id) }))
    .filter((c) => c.talks.length > 0);

  return { conference, timeBlocks, sessions: sessions.map((s) => ({ ...s, talks: s.talks.map((t) => t.id) })), conferences };
}

/** The map of the whole programme, or 503 before it is loaded. */
export async function answerProgrammeMap(whole: Pick<WholeProgrammeStore, "contents">, conference: string): Promise<Response> {
  const contents = await whole.contents();
  if (contents.talks.length === 0) return plain(503, "AMS's whole published programme is not loaded yet: run the load command.");
  return Response.json(ProgrammeMapSchema.parse(programmeMap(contents, conference)));
}
