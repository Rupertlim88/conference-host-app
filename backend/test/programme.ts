import type { SocietyRows } from "@repo/host-store";

const at = (iso: string) => new Date(iso);
const talk = (id: string, number: string, startsAt: string) => ({
  id,
  sessionId: "S1",
  number,
  title: `Talk about storms ${id}`,
  abstract: "Text.",
  kind: "oral" as const,
  startsAt: at(startsAt),
  endsAt: null,
  room: "350D",
  building: "GRB",
  booth: "",
  presentingAuthor: "Ada Author",
  authorLine: "Ada Author, Somewhere",
  affiliations: [],
  doi: "",
  citation: "",
  trackIds: ["P1"],
  sort: 0,
  coreKeynote: id === "T2",
  newFellow: false,
  supplementary: false,
});
/** A small AMS-like programme for database tests: session S1 (J7) holds T1 and T2, both by Ada Author; T2 is a
 *  core keynote. The exhibit hall lists one booth, B1. */
export const rows: SocietyRows = {
  meeting: {
    name: "Test Meeting",
    startsOn: "2026-01-25",
    endsOn: "2026-01-29",
    timeZone: "America/Chicago",
    venue: "Hall",
    city: "Houston, TX",
    about: "",
  },
  tracks: [
    { id: "P1", code: "EDU", title: "Education", sort: 0, listed: true },
    { id: "P2", code: "EXHIBITHALL", title: "Main Exhibit Hall", sort: 1, listed: false },
  ],
  sessions: [
    {
      id: "S1",
      number: "J7",
      title: "Storm session",
      kind: "Session",
      format: "",
      description: "",
      chairs: "",
      startsAt: at("2026-01-27T19:45:00Z"),
      endsAt: at("2026-01-27T21:00:00Z"),
      room: "350D",
      building: "GRB",
      trackIds: ["P1"],
      peopleThemed: true,
    },
    {
      id: "B1",
      number: "",
      title: "Booth Co.",
      kind: "Session",
      format: "",
      description: "",
      chairs: "",
      startsAt: null,
      endsAt: null,
      room: "",
      building: "",
      trackIds: ["P2"],
      peopleThemed: false,
    },
  ],
  talks: [talk("T1", "J7.1", "2026-01-27T19:45:00Z"), talk("T2", "J7.2", "2026-01-27T20:00:00Z")],
  people: [{ id: "ada-author", name: "Ada Author", affiliation: "Somewhere" }],
  talkPeople: [
    { talkId: "T1", personId: "ada-author" },
    { talkId: "T2", personId: "ada-author" },
  ],
  infoLists: [{ page: "officers", position: 0, heading: "Local Organizing Committee", lines: ["Ada Author, Chair"] }],
};

