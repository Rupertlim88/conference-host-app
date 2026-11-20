import { z } from "zod";

import { htmlToText } from "./html";
import { personId, type PersonRow, type SessionRow, type SocietyRows, type TalkKind, type TalkRow } from "./rows";

// The public download pads some values with spaces ("Event "); every text value is trimmed where it enters.
const text = z.string().nullish().transform((v) => (v ?? "").trim());
const title = z.string().trim();
const refs = z.array(z.string());

const PaperSchema = z.object({
  id: z.string(),
  FinalNumber: text,
  Type: z.enum(["Oral", "Poster", "Break"]),
  Title: title,
  Abstract: text,
  TopDisplay: text,
  EntryCitation_apa: text,
  ParentList_ParentEntries: refs,
  ParentList_SlotData: refs,
});

const SessionSchema = z.object({
  id: z.string(),
  FinalNumber: text,
  FinalSessionNumber: text,
  Title: title,
  Type: text,
  label: text,
  isPoster: z.union([z.number(), z.string()]).nullable(),
  Description: text,
  TopDisplay: text,
  ParentList_ParentEntries: refs,
  ParentList_SlotData: refs,
});

const SlotSchema = z.object({
  id: z.string(),
  Slot_StartDateTime: z.string().nullable(),
  Slot_EndDateTime: z.string().nullable(),
  Room_Name: text,
  Property_Name: text,
  Entry_PosterNumber: text,
});

const ProgramSchema = z.object({ id: z.string(), ProgramCode: z.string(), Title: title });

/** The four committed AMS files: Paper, Session, SlotData and Program. Other fields are ignored. */
export const AmsFilesSchema = z.object({
  Paper: z.array(PaperSchema),
  Session: z.array(SessionSchema),
  SlotData: z.array(SlotSchema),
  Program: z.array(ProgramSchema),
});
export type AmsFiles = z.infer<typeof AmsFilesSchema>;

const MEETING = {
  name: "107th AMS Annual Meeting",
  startsOn: "2027-01-10",
  endsOn: "2027-01-14",
  timeZone: "America/Denver",
  venue: "Colorado Convention Center",
  city: "Denver, CO",
  about: "The American Meteorological Society's 107th Annual Meeting, in Denver and online.",
};

// Confex writes a session's kind and number together, as in "Joint Session J8" or "Session 5". A session not yet
// numbered reads "Session " or "Poster Session ". Some sessions carry an internal type id, such as "2753", in Type.
const NUMBER_AT_END = /\s*(\S*\d\S*)\s*$/;
const numberIn = (finalNumber: string) => NUMBER_AT_END.exec(finalNumber)?.[1] ?? "";
const kindIn = (finalNumber: string) => finalNumber.replace(NUMBER_AT_END, "").trim();
const isTypeId = (type: string) => /^\d+$/.test(type);

const epoch = (ms: string | null) => (ms ? new Date(Number(ms)) : null);
const idsOf = (entries: string[], kind: string) =>
  entries.filter((e) => e.startsWith(`${kind}/`)).map((e) => e.slice(kind.length + 1));

/** "Organizer: Clara Orbe, GISS; CoChair: ..." from Confex's session TopDisplay. */
function chairsFrom(topDisplay: string): string {
  const groups = [...topDisplay.matchAll(/topdisplay_role'>(.*?)<\/span><span class='topdisplay_people'>(.*?)<\/span>/g)];
  return groups
    .map(([, role, people]) => `${htmlToText(role ?? "").replace(/:\s*$/, "")}: ${htmlToText(people ?? "")}`)
    .join("; ");
}

/** The presenter is the bold name in TopDisplay; their affiliation runs to the first semicolon. */
function presenterFrom(topDisplay: string): { name: string; affiliation: string } | null {
  const m = /<b>(.*?)<\/b>\s*,?\s*([^;]*)/.exec(topDisplay);
  if (!m) return null;
  const name = htmlToText(m[1] ?? "");
  return name ? { name, affiliation: htmlToText(m[2] ?? "") } : null;
}

export function amsRows(files: AmsFiles): SocietyRows {
  const slots = new Map(files.SlotData.map((s) => [s.id, s]));
  const slotOf = (entries: string[]) => idsOf(entries, "SlotData").map((id) => slots.get(id)).find(Boolean);
  const programIds = new Set(files.Program.map((p) => p.id));
  const tracksOf = (entries: string[]) => idsOf(entries, "Program").filter((id) => programIds.has(id));

  const sessions: SessionRow[] = files.Session.map((s) => {
    const slot = slotOf(s.ParentList_SlotData);
    return {
      id: s.id,
      number: s.FinalSessionNumber.trim() || numberIn(s.FinalNumber),
      title: htmlToText(s.Title),
      kind: (s.Type && !isTypeId(s.Type) ? s.Type : kindIn(s.FinalNumber)) || s.label || "Session",
      format: Number(s.isPoster) === 1 ? "Poster" : "",
      description: htmlToText(s.Description),
      chairs: chairsFrom(s.TopDisplay),
      startsAt: epoch(slot?.Slot_StartDateTime ?? null),
      endsAt: epoch(slot?.Slot_EndDateTime ?? null),
      room: slot?.Room_Name ?? "",
      building: slot?.Property_Name ?? "",
      trackIds: tracksOf(s.ParentList_ParentEntries),
    };
  });
  const sessionIds = new Set(sessions.map((s) => s.id));

  const people = new Map<string, PersonRow>();
  const talkPeople: SocietyRows["talkPeople"] = [];
  const talks: TalkRow[] = files.Paper.map((p) => {
    const slot = slotOf(p.ParentList_SlotData);
    const presenter = presenterFrom(p.TopDisplay);
    if (presenter) {
      const id = personId(presenter.name);
      if (!people.has(id)) people.set(id, { id, name: presenter.name, affiliation: presenter.affiliation });
      talkPeople.push({ talkId: p.id, personId: id });
    }
    const sessionId = idsOf(p.ParentList_ParentEntries, "Session").find((id) => sessionIds.has(id)) ?? null;
    return {
      id: p.id,
      sessionId,
      number: p.FinalNumber,
      title: htmlToText(p.Title),
      abstract: htmlToText(p.Abstract),
      kind: p.Type.toLowerCase() as TalkKind,
      startsAt: epoch(slot?.Slot_StartDateTime ?? null),
      endsAt: epoch(slot?.Slot_EndDateTime ?? null),
      room: slot?.Room_Name ?? "",
      building: slot?.Property_Name ?? "",
      booth: slot?.Entry_PosterNumber ?? "",
      presentingAuthor: presenter?.name ?? "",
      authorLine: htmlToText(p.TopDisplay),
      affiliations: [],
      doi: "",
      citation: htmlToText(p.EntryCitation_apa),
      trackIds: tracksOf(p.ParentList_ParentEntries),
      sort: 0,
    };
  });

  // Order talks inside each session by start time, then number.
  const bySession = new Map<string | null, TalkRow[]>();
  for (const t of talks) bySession.set(t.sessionId, [...(bySession.get(t.sessionId) ?? []), t]);
  for (const group of bySession.values()) {
    group
      .sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0) || a.number.localeCompare(b.number))
      .forEach((t, i) => (t.sort = i));
  }

  return {
    meeting: MEETING,
    tracks: files.Program.map((p, i) => ({ id: p.id, code: p.ProgramCode, title: p.Title, sort: i })),
    sessions,
    talks,
    people: [...people.values()],
    talkPeople,
  };
}
