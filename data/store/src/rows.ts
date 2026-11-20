import type { SocietyTables } from "./schema";

export type MeetingRow = Omit<SocietyTables["meeting"]["$inferSelect"], "id">;
export type TrackRow = SocietyTables["tracks"]["$inferSelect"];
type PublishedSession = "pubStartsAt" | "pubEndsAt" | "pubRoom" | "pubBuilding";
type PublishedTalk = PublishedSession | "pubSessionId" | "pubSort";
/** A session as a programme file gives it; the loader records it as published too. */
export type SessionRow = Omit<SocietyTables["sessions"]["$inferSelect"], PublishedSession>;
export type TalkKind = "oral" | "poster" | "break";
/** A talk as a programme file gives it; the loader records it as published too, and never withdrawn. */
export type TalkRow = Omit<SocietyTables["talks"]["$inferSelect"], PublishedTalk | "withdrawn"> & { kind: TalkKind };
export type PersonRow = SocietyTables["people"]["$inferSelect"];
export type TalkPersonRow = SocietyTables["talkPeople"]["$inferSelect"];

/** Everything one society's programme loads into the store. */
export interface SocietyRows {
  meeting: MeetingRow;
  tracks: TrackRow[];
  sessions: SessionRow[];
  talks: TalkRow[];
  people: PersonRow[];
  talkPeople: TalkPersonRow[];
}

/** A stable id from a person's name: lower case, accents dropped, other characters as hyphens. */
export function personId(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
