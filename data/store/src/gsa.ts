import { z } from "zod";

import { personId, type PersonRow, type SessionRow, type SocietyRows, type TalkRow } from "./rows";
import { toClock24, zonedInstant } from "./time";

const PresentationSchema = z.object({
  paper_no: z.string(),
  booth: z.string(),
  title: z.string(),
  presenting_author: z.string(),
  start: z.string(),
  end: z.string(),
  application_id: z.number().nullable(),
});

const SessionSchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string(),
  chairs: z.string(),
  description: z.string(),
  date_time: z.string(),
  room: z.string(),
  session_type: z.string(),
  format: z.string(),
  presentations: z.array(PresentationSchema),
});

const AbstractSchema = z.object({
  application_id: z.number(),
  session_id: z.number(),
  paper_no: z.string(),
  title: z.string(),
  presenting_author: z.string(),
  authors: z.string(),
  affiliations: z.array(z.string()),
  abstract: z.string(),
  citation: z.string(),
  doi: z.string(),
  category: z.string(),
  format: z.string(),
  date: z.string(),
  start_time: z.string(),
  room: z.string(),
});

/** The two committed GSA files: connects26-sessions.json and connects26-abstracts.json. */
export const GsaFilesSchema = z.object({ sessions: z.array(SessionSchema), abstracts: z.array(AbstractSchema) });
export type GsaFiles = z.infer<typeof GsaFilesSchema>;

const TIME_ZONE = "America/Denver";
const YEAR = 2026;
const MEETING = {
  name: "GSA Connects 2026",
  startsOn: "2026-10-11",
  endsOn: "2026-10-14",
  timeZone: TIME_ZONE,
  venue: "Colorado Convention Center",
  city: "Denver, CO",
  about: "The Geological Society of America's annual meeting, at the Colorado Convention Center in Denver.",
};
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const slug = (text: string) => personId(text);
const pad = (n: number) => String(n).padStart(2, "0");

/** "Monday, 12 October - 1:30 PM (Mountain Time ...)" gives the date and the 24-hour start. */
function sessionStart(dateTime: string): { date: string; time: string } | null {
  const m = /^\w+,\s+(\d{1,2})\s+(\w+)\s+-\s+(\d{1,2}:\d{2}\s*[AP]M)/i.exec(dateTime);
  const month = m ? MONTHS.indexOf(m[2]!.toLowerCase()) + 1 : 0;
  const time = m ? toClock24(m[3]!) : null;
  if (!m || month === 0 || !time) return null;
  return { date: `${YEAR}-${pad(month)}-${pad(Number(m[1]))}`, time };
}

/** "10/12/2026" gives "2026-10-12". */
function isoDate(usDate: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(usDate.trim());
  return m ? `${m[3]}-${pad(Number(m[1]))}-${pad(Number(m[2]))}` : null;
}

function at(date: string | null, clock: string | null): Date | null {
  return date && clock ? zonedInstant(date, clock, TIME_ZONE) : null;
}

export function gsaRows(files: GsaFiles): SocietyRows {
  const categories = [...new Set(files.abstracts.map((a) => a.category))].sort();
  const sessionsById = new Map(files.sessions.map((s) => [s.id, s]));
  const people = new Map<string, PersonRow>();
  const talkPeople: SocietyRows["talkPeople"] = [];

  const talks: TalkRow[] = files.abstracts.map((a) => {
    const session = sessionsById.get(a.session_id);
    const start = session ? sessionStart(session.date_time) : null;
    const index = session?.presentations.findIndex((p) => p.application_id === a.application_id) ?? -1;
    const row = index >= 0 ? session!.presentations[index]! : null;
    const date = isoDate(a.date) ?? start?.date ?? null;
    const startsAt = at(date, toClock24(a.start_time)) ?? at(start?.date ?? null, start?.time ?? null);
    const endsAt = at(date, row ? toClock24(row.end) : null);
    if (a.presenting_author) {
      const id = personId(a.presenting_author);
      if (!people.has(id)) people.set(id, { id, name: a.presenting_author, affiliation: "" });
      talkPeople.push({ talkId: String(a.application_id), personId: id });
    }
    return {
      id: String(a.application_id),
      sessionId: session ? String(session.id) : null,
      number: a.paper_no,
      title: a.title,
      abstract: a.abstract,
      kind: a.format.toLowerCase() === "poster" ? "poster" : "oral",
      startsAt,
      endsAt,
      room: a.room,
      building: "",
      booth: row?.booth ?? "",
      presentingAuthor: a.presenting_author,
      authorLine: a.authors,
      affiliations: a.affiliations,
      doi: a.doi,
      citation: a.citation,
      trackIds: [slug(a.category)],
      sort: index,
    };
  });

  const sessions: SessionRow[] = files.sessions.map((s) => {
    const start = sessionStart(s.date_time);
    const own = talks.filter((t) => t.sessionId === String(s.id));
    const ends = own.map((t) => t.endsAt?.getTime()).filter((v): v is number => v !== undefined);
    return {
      id: String(s.id),
      number: s.number,
      title: s.title,
      kind: s.session_type,
      format: s.format,
      description: s.description,
      chairs: s.chairs,
      startsAt: at(start?.date ?? null, start?.time ?? null),
      endsAt: ends.length ? new Date(Math.max(...ends)) : null,
      room: s.room,
      building: "",
      trackIds: [...new Set(own.flatMap((t) => t.trackIds))].sort(),
    };
  });

  return {
    meeting: MEETING,
    tracks: categories.map((title, i) => ({ id: slug(title), code: "", title, sort: i })),
    sessions,
    talks,
    people: [...people.values()],
    talkPeople,
  };
}
