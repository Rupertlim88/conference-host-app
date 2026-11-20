/** The four record types the loader reads from the Confex Meeting App's public API for a meeting. */
export const AMS_TYPES = ["Paper", "Session", "SlotData", "Program"] as const;
export type AmsType = (typeof AMS_TYPES)[number];

type Row = Record<string, unknown>;
export type AmsFiles = Record<AmsType, Row[]>;

/**
 * The fields the public programme shows, per type: every other field is dropped before anything is stored
 * (data/CLAUDE.md rule 3). The API also returns reviewer ratings and comments, submitters' notes,
 * payment and account details, withdrawal reasons and session subtitles that carry organisers' email addresses.
 * A field AMS adds later is dropped until it is added here.
 */
const PUBLIC_FIELDS: Record<AmsType, readonly string[]> = {
  Paper: ["Abstract", "Avail_InPerson", "Avail_Virtual", "ChildList_Keyword", "ChildList_Person", "ChildList_Role", "EntryCitation_apa", "FinalNumber", "Invited", "Keynote", "MeetingTitle", "ParentList_ParentEntries", "ParentList_SlotData", "PresentationLocation", "PresentingAuthor", "ProgramCode", "ProgramTitle", "SessionTitle", "Session_GoodType", "SortableTimeString", "SubjectTitle", "Title", "TopDisplay", "Type", "_url", "id"],
  Session: ["Avail_InPerson", "Avail_Virtual", "ChildList_Paper", "ChildList_Person", "ChildList_Role", "Description", "FinalNumber", "FinalSessionNumber", "GoodType", "MeetingTitle", "ParentList_ParentEntries", "ParentList_SlotData", "ProgramCode", "ProgramTitle", "ShortTitle", "SortableTimeString", "SubjectTitle", "Title", "TopDisplay", "Type", "_url", "id", "isPoster", "label"],
  SlotData: ["Avail_InPerson", "Avail_Virtual", "Entry_FinalNumber", "Entry_PosterNumber", "Entry_Title", "Entry_TopDisplay", "Entry_Type", "Entry_isPoster", "Entryid", "MGroupType", "Order", "ParentList_ParentEntries", "ProgramCode", "ProgramTitle", "Property_Name", "Room_Floor", "Room_Name", "SessionTitle", "Session_GoodType", "Session_id", "Slot_Date", "Slot_EndDateTime", "Slot_EndTime", "Slot_SessionEndTime", "Slot_SessionStartTime", "Slot_StartDateTime", "Slot_StartTime", "TimeZoneOffset", "_url", "id"],
  Program: ["ChildList_Paper", "ChildList_Session", "Code", "GoodType", "HighlightColor", "NavBarTitle", "ProgramCode", "Title", "Type", "_url", "id", "label"],
};

/** Programmes that list exhibitors, sponsors and deleted entries, not talks. */
const NOT_PROGRAMME = new Set(["EXHIBITHALL", "SPONSORS", "TRASH"]);

/**
 * Shown on the public programme: not withdrawn (AMS marks a withdrawn paper "w"; it marks two live sessions "i",
 * and its own app shows them), not left out of the web programme, and not in an exhibitor or sponsor programme.
 */
const shown = (row: Row) => row.Withdrawn !== "w" && String(row.WebprogramExclude) !== "1" && !NOT_PROGRAMME.has(String(row.ProgramCode ?? ""));

/**
 * Authors' rich text with every tag's attributes removed. Their editors leave hidden attributes the programme never
 * shows, and one 2027 abstract carried its author's email in 453 of them. Confex's own TopDisplay keeps its classes,
 * which the loader reads.
 */
const bareTags = (value: unknown) => (typeof value === "string" ? value.replace(/<([a-zA-Z][\w:-]*)[^>]*>/g, "<$1>") : value);
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
