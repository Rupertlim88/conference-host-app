import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ZodError } from "zod";

import { AmsFilesSchema, amsRows, htmlToText } from "../src/ams-rows";

const files = AmsFilesSchema.parse(
  JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/ams-slice.json"), "utf8")),
);
const rows = amsRows(files);
const talk = (number: string) => rows.talks.find((t) => t.number === number)!;

describe("amsRows", () => {
  test("meeting is the 107th Annual Meeting in Denver time", () => {
    expect(rows.meeting).toMatchObject({
      name: "107th AMS Annual Meeting",
      startsOn: "2027-01-10",
      endsOn: "2027-01-14",
      timeZone: "America/Denver",
      venue: "Colorado Convention Center",
      city: "Denver, CO",
    });
  });

  test("a slot with no room yet gives its session no room", () => {
    const raw = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/ams-slice.json"), "utf8"));
    for (const slot of raw.SlotData) {
      delete slot.Room_Name;
      delete slot.Property_Name;
    }
    const s = amsRows(AmsFilesSchema.parse(raw)).sessions.find((x) => x.id === "73193")!;
    expect(s).toMatchObject({ room: "", building: "" });
  });

  test("a session with no number yet gets none, and a numeric type is not its kind", () => {
    const base = files.Session.find((x) => x.id === "73193")!;
    const session = (over: Partial<typeof base>) =>
      amsRows({ ...files, Session: [{ ...base, ...over }] }).sessions[0]!;
    expect(session({ FinalSessionNumber: "", FinalNumber: "Session ", Type: "" })).toMatchObject({ number: "", kind: "Session" });
    expect(session({ FinalSessionNumber: "", FinalNumber: "Poster Session ", Type: "Poster Session" })).toMatchObject({
      number: "",
      kind: "Poster Session",
    });
    expect(session({ FinalSessionNumber: "J8", FinalNumber: "Joint Session J8", Type: "2753" })).toMatchObject({
      number: "J8",
      kind: "Joint Session",
    });
    expect(session({ FinalSessionNumber: "5", FinalNumber: "Session 5", Type: "" })).toMatchObject({ number: "5", kind: "Session" });
  });

  test("programmes become tracks", () => {
    expect(rows.tracks.map((t) => t.code).sort()).toEqual(["EDUCATION", "MIDDLE", "TOWNHALL", "TROPICAL"]);
  });

  test("a session gets its number, slot time, room, chairs and tracks", () => {
    const s = rows.sessions.find((x) => x.id === "73193")!;
    expect(s.number).toBe("J7");
    expect(s.kind).toBe("Joint Session");
    expect(s.startsAt?.toISOString()).toBe("2026-01-27T19:45:00.000Z");
    expect(s.endsAt?.toISOString()).toBe("2026-01-27T21:00:00.000Z");
    expect(s.room).toBe("350D");
    expect(s.building).toBe("George R. Brown Convention Center");
    expect(s.chairs).toBe(
      "Organizer: Clara Orbe, GISS, New York, NY; CoChair: Cameron Raymond Paquette, Marine Meteorology Lab, NRL, Monterey, CA",
    );
    expect(s.trackIds.sort()).toEqual(["1878", "1891"]);
  });

  test("a talk gets its session, time, room, presenter and plain-text abstract", () => {
    const t = talk("J7.1");
    expect(t).toMatchObject({
      id: "464598",
      sessionId: "73193",
      kind: "oral",
      room: "350D",
      presentingAuthor: "William J Graff",
      authorLine: "William J Graff, US Air Force, WPAFB, OH",
    });
    expect(t.startsAt?.toISOString()).toBe("2026-01-27T19:45:00.000Z");
    expect(t.abstract.startsWith("The Air Force's Basic Meteorology Program")).toBe(true);
    expect(t.abstract).not.toContain("<");
    expect(t.citation.startsWith("Graff, W. J. (2026)")).toBe(true);
  });

  test("talks in a session are ordered by time", () => {
    const order = rows.talks.filter((t) => t.sessionId === "73193").sort((a, b) => a.sort - b.sort);
    expect(order.map((t) => t.number)).toEqual(["J7.1", "J7.2", "J7.3", "J7.4", "J7.5"]);
  });

  test("a poster is kind poster", () => {
    expect(talk("7.4A")).toMatchObject({ kind: "poster", sessionId: "73941", room: "352D" });
  });

  test("a break whose session is not loaded keeps no session and no time", () => {
    const b = rows.talks.find((t) => t.id === "463533")!;
    expect(b).toMatchObject({ kind: "break", sessionId: null, startsAt: null, presentingAuthor: "" });
  });

  test("each presenter becomes a person linked to their talk", () => {
    const p = rows.people.find((x) => x.name === "William J Graff")!;
    expect(p).toEqual({ id: "william-j-graff", name: "William J Graff", affiliation: "US Air Force, WPAFB, OH" });
    expect(rows.talkPeople).toContainEqual({ talkId: "464598", personId: "william-j-graff" });
  });
});

describe("amsRows on the public download's stray spaces", () => {
  const raw = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/ams-slice.json"), "utf8"));
  const event = { ...raw.Session[0], id: "74577", FinalNumber: "Event ", FinalSessionNumber: "", Type: "Event", Title: " Local Chapter Officers' Breakfast " };
  const spaced = amsRows(AmsFilesSchema.parse({ ...raw, Session: [...raw.Session, event] }));

  test("a session number or title keeps no leading or trailing spaces", () => {
    const s = spaced.sessions.find((x) => x.id === "74577")!;
    expect(s).toMatchObject({ number: "", kind: "Event" });
    expect(s.title).toBe("Local Chapter Officers' Breakfast");
  });
});

describe("checking the files", () => {
  test("files that do not have AMS's form are refused before anything is mapped", () => {
    expect(() => amsRows({ Paper: [{ id: 1 }], Session: [], SlotData: [], Program: [] })).toThrow(ZodError);
    expect(() => amsRows({ Paper: [] })).toThrow(ZodError);
  });
});

describe("htmlToText", () => {
  test("keeps paragraphs apart and drops tags", () => {
    expect(htmlToText("<div><p>First <b>part</b>.</p><p>Second&nbsp;part.</p></div>")).toBe(
      "First part.\n\nSecond part.",
    );
  });
  test("turns list items into bullets", () => {
    expect(htmlToText("<ul><li>One</li><li>Two</li></ul>")).toBe("• One\n\n• Two");
  });
  test("decodes named and numeric entities", () => {
    expect(htmlToText("Graff, W. J.&nbsp;(2026) &amp; &#8220;Storm&#x201D; &lt;b&gt;")).toBe(
      "Graff, W. J. (2026) & “Storm” <b>",
    );
  });
  test("collapses runs of spaces and line breaks inside a paragraph", () => {
    expect(htmlToText("\n\tA  line<br>broken\n here ")).toBe("A line broken here");
  });
  test("gives an empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
  });
});
