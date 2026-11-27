// AMS's public programme is fetched in nine requests, two seconds apart, and only what the programme shows is kept.
import { createHash } from "node:crypto";

import { LISTINGS } from "./ams-rows";

/** The four record types the loader reads from the Confex Meeting App's public API for a meeting. */
export const AMS_TYPES = ["Paper", "Session", "SlotData", "Program"] as const;
export type AmsType = (typeof AMS_TYPES)[number];

type Row = Record<string, unknown>;
export type AmsFiles = Record<AmsType, Row[]>;

/**
 * The fields the public programme shows, per type: every other field is dropped before anything is stored
 * (the data layer's rule that the meeting's data holds only what the public programme shows). The API also
 * returns reviewer ratings and comments, submitters' notes, payment and account details, withdrawal reasons and
 * session subtitles that carry organisers' email addresses.
 * A field AMS adds later is dropped until it is added here.
 */
const PUBLIC_FIELDS: Record<AmsType, readonly string[]> = {
  Paper: ["Abstract", "Avail_InPerson", "Avail_Virtual", "ChildList_Keyword", "ChildList_Person", "ChildList_Role", "EntryCitation_apa", "FinalNumber", "Invited", "Keynote", "MeetingTitle", "ParentList_ParentEntries", "ParentList_SlotData", "PresentationLocation", "PresentingAuthor", "ProgramCode", "ProgramTitle", "SessionTitle", "Session_GoodType", "SortableTimeString", "SubjectTitle", "Title", "TopDisplay", "Type", "_url", "id"],
  Session: ["Avail_InPerson", "Avail_Virtual", "ChildList_Paper", "ChildList_Person", "ChildList_Role", "Description", "FinalNumber", "FinalSessionNumber", "GoodType", "MeetingTitle", "ParentList_ParentEntries", "ParentList_SlotData", "ProgramCode", "ProgramTitle", "ShortTitle", "SortableTimeString", "SubjectTitle", "Title", "TopDisplay", "Type", "_url", "id", "isPoster", "label"],
  SlotData: ["Avail_InPerson", "Avail_Virtual", "Entry_FinalNumber", "Entry_PosterNumber", "Entry_Title", "Entry_TopDisplay", "Entry_Type", "Entry_isPoster", "Entryid", "MGroupType", "Order", "ParentList_ParentEntries", "ProgramCode", "ProgramTitle", "Property_Name", "Room_Floor", "Room_Name", "SessionTitle", "Session_GoodType", "Session_id", "Slot_Date", "Slot_EndDateTime", "Slot_EndTime", "Slot_SessionEndTime", "Slot_SessionStartTime", "Slot_StartDateTime", "Slot_StartTime", "TimeZoneOffset", "_url", "id"],
  Program: ["ChildList_Paper", "ChildList_Session", "Code", "GoodType", "HighlightColor", "NavBarTitle", "ProgramCode", "Title", "Type", "_url", "id", "label"],
};


/**
 * Shown on the public programme: not withdrawn (AMS marks a withdrawn paper "w"; it marks two live sessions "i",
 * and its own app shows them), and either in a listing or neither left out of the web programme nor in the waste
 * basket.
 */
const shown = (row: Row) => {
  const code = String(row.ProgramCode ?? "");
  return row.Withdrawn !== "w" && (LISTINGS.has(code) || (String(row.WebprogramExclude) !== "1" && code !== "TRASH"));
};

/**
 * Authors' rich text with every tag's attributes removed. Their editors leave hidden attributes the programme never
 * shows, and one 2027 abstract carried its author's email in 453 of them. Confex's own TopDisplay keeps its classes,
 * which the loader reads.
 */
/** An opening tag whose attributes are well quoted, so a ">" inside a quoted value does not end it. Outside quotes a
 *  tag never runs past the next "<", so text full of unclosed tags is cleaned in one pass. */
const QUOTED_TAG = /<([a-zA-Z][\w:-]*)(?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*\s*\/?>/g;
/** Any other opening tag with attributes, such as one whose quotes an editor left unbalanced. */
const LOOSE_TAG = /<([a-zA-Z][\w:-]*)[^<>]*>/g;
const bareTags = (value: unknown) =>
  typeof value === "string" ? value.replace(QUOTED_TAG, "<$1>").replace(LOOSE_TAG, "<$1>") : value;
const withBareTags = (row: Row, field: string): Row => (field in row ? { ...row, [field]: bareTags(row[field]) } : row);

const refs = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);
const pick = (type: AmsType, row: Row): Row => Object.fromEntries(PUBLIC_FIELDS[type].filter((f) => f in row).map((f) => [f, row[f]]));

/**
 * The programme as the public meeting app shows it, from the API's unfiltered lists. A paper in a left-out session is
 * left out with it, a slot is kept only for a kept paper or session, and lists stop naming what was left out. Only
 * public fields are kept.
 */
export function publicProgramme(raw: AmsFiles): AmsFiles {
  const sessions = raw.Session.filter(shown);
  const sessionRefs = new Set(sessions.map((s) => `Session/${String(s.id)}`));
  const inShownSession = (paper: Row) => refs(paper.ParentList_ParentEntries).filter((r) => r.startsWith("Session/")).every((r) => sessionRefs.has(r));
  const papers = raw.Paper.filter((p) => shown(p) && inShownSession(p));
  const kept = new Set([...sessionRefs, ...papers.map((p) => `Paper/${String(p.id)}`)]);
  const prune = (row: Row, lists: string[]): Row => ({ ...row, ...Object.fromEntries(lists.filter((l) => l in row).map((l) => [l, refs(row[l]).filter((r) => kept.has(r))])) });
  return {
    Paper: papers.map((p) => pick("Paper", withBareTags(p, "Abstract"))),
    Session: sessions.map((s) => pick("Session", withBareTags(prune(s, ["ChildList_Paper"]), "Description"))),
    SlotData: raw.SlotData.filter((s) => kept.has(String(s.Entryid))).map((s) => pick("SlotData", s)),
    Program: raw.Program.filter(shown).map((p) => pick("Program", prune(p, ["ChildList_Session", "ChildList_Paper"]))),
  };
}

/** The lists behind four of Program Highlights' pages, each an index of the meeting app's API. */
export const HIGHLIGHTS = {
  themed: "SpecialTheme~1",
  supplementary: "hasHandouts~1",
  keynotes: "CoreKeynote~Yes",
  fellows: "NewFellowAward~Yes",
} as const;
export type HighlightList = keyof typeof HIGHLIGHTS;
export type Highlights = Record<HighlightList, string[]>;

/** Each highlight list's sessions or papers that the public programme keeps, by id. */
export function highlightIds(indexes: Record<HighlightList, Row>, kept: AmsFiles): Highlights {
  const keptRefs = new Set([...kept.Session.map((s) => `Session/${String(s.id)}`), ...kept.Paper.map((p) => `Paper/${String(p.id)}`)]);
  const entries = (index: Row) => [...refs(index.ChildList_Session), ...refs(index.ChildList_Paper)];
  const idsIn = (index: Row) => entries(index).filter((r) => keptRefs.has(r)).map((r) => r.slice(r.indexOf("/") + 1));
  return Object.fromEntries(Object.keys(HIGHLIGHTS).map((list) => [list, idsIn(indexes[list as HighlightList])])) as Highlights;
}

/** The two pages of the meeting's information that are lists of names. */
export const NAME_PAGES = { officers: "Officers", committees: "Committees" } as const;
export type NamePage = keyof typeof NAME_PAGES;
export interface NameSection {
  heading: string;
  lines: string[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const plain = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|[a-z]+);/gi, (whole, code: string) =>
      code.startsWith("#") ? String.fromCodePoint(Number(code.slice(1))) : (ENTITIES[code.toLowerCase()] ?? whole),
    )
    .replace(/\s+/g, " ")
    .trim();

/** The headings of a page of names, each with the lines of names under it. A heading is an h-tag or a paragraph that
 *  is bold throughout; a line break starts a new line. A heading with no names under it, such as the society's thanks,
 *  is AMS's own words, and is dropped. */
export function nameLists(html: string): NameSection[] {
  const sections: NameSection[] = [];
  for (const [, tag = "", inner = ""] of html.matchAll(/<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = plain(inner);
    if (!text) continue;
    const isHeading = tag.toLowerCase().startsWith("h") || plain(inner.replace(/<(b|strong)\b[^>]*>[\s\S]*?<\/\1>/gi, "")) === "";
    if (isHeading) sections.push({ heading: text, lines: [] });
    else sections.at(-1)?.lines.push(...inner.split(/<br\s*\/?>/i).map(plain).filter(Boolean));
  }
  return sections.filter((s) => s.lines.length > 0);
}

const MEETING = "107ANNUAL";
const SOURCE = `https://ams.confex.com/ams/${MEETING}/meetingapi.cgi`;

/** Everything the fetch keeps: the programme's four types, the highlight lists and the pages of names. */
export type KeptFiles = AmsFiles & { Highlights: Highlights; MeetingInfo: Record<NamePage, NameSection[]> };

const pause = () => new Promise((resolve) => setTimeout(resolve, 2000));

/** Downloads the four types, the four highlight indexes and the meeting's information, one at a time, two seconds
 *  apart, and keeps only what the public programme shows. The unfiltered downloads stay in memory; each is hashed so a
 *  later download can be compared. */
export async function fetchAms(): Promise<{ meeting: string; raw: AmsFiles; kept: KeptFiles; hashes: Record<string, string> }> {
  const hashes: Record<string, string> = {};
  let first = true;
  const get = async (path: string): Promise<unknown> => {
    if (!first) await pause();
    first = false;
    const res = await fetch(`${SOURCE}/${path}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${SOURCE}/${path} answered ${res.status}`);
    const text = await res.text();
    hashes[path] = createHash("sha256").update(text).digest("hex");
    return JSON.parse(text);
  };
  const list = async (path: string): Promise<Row[]> => {
    const body = await get(path);
    const rows = Array.isArray(body) ? body : (body as { data?: unknown }).data;
    if (!Array.isArray(rows)) throw new Error(`${SOURCE}/${path} did not return a list`);
    return rows as Row[];
  };

  const raw = {} as AmsFiles;
  for (const type of AMS_TYPES) raw[type] = await list(type);
  const indexes = {} as Record<HighlightList, Row>;
  for (const [name, id] of Object.entries(HIGHLIGHTS)) indexes[name as HighlightList] = (await get(`Index/${id}`)) as Row;
  const info = await list("ModuleMeetingInfo");
  const page = (id: string) => String(info.find((p) => p.id === id)?.Content ?? "");

  // The lists are filtered together: a paper in a left-out session goes with it, and slots follow their entries.
  const programme = publicProgramme(raw);
  const kept: KeptFiles = {
    ...programme,
    Highlights: highlightIds(indexes, programme),
    MeetingInfo: { officers: nameLists(page(NAME_PAGES.officers)), committees: nameLists(page(NAME_PAGES.committees)) },
  };
  return { meeting: MEETING, raw, kept, hashes };
}
