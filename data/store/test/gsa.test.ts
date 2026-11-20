import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { GsaFilesSchema, gsaRows } from "../src/gsa";

const files = GsaFilesSchema.parse(
  JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/gsa-slice.json"), "utf8")),
);
const rows = gsaRows(files);
const talk = (id: string) => rows.talks.find((t) => t.id === id)!;

describe("gsaRows", () => {
  test("meeting is GSA Connects 2026 in Denver time", () => {
    expect(rows.meeting).toMatchObject({
      name: "GSA Connects 2026",
      startsOn: "2026-10-11",
      endsOn: "2026-10-14",
      timeZone: "America/Denver",
    });
  });

  test("a session gets its number, start from its date line, and end from its last talk", () => {
    const s = rows.sessions.find((x) => x.id === "96389")!;
    expect(s).toMatchObject({ number: "173", title: "T104. Advances in hydrologic modeling", room: "CCC, 111" });
    expect(s.chairs).toBe("Andrew Leaf, Anna Fehling");
    expect(s.startsAt?.toISOString()).toBe("2026-10-12T19:30:00.000Z");
    expect(s.endsAt?.toISOString()).toBe("2026-10-12T23:30:00.000Z");
  });

  test("an oral abstract gets its number, times, authors, affiliations and DOI", () => {
    const t = talk("16121");
    expect(t).toMatchObject({
      sessionId: "96389",
      number: "173-1",
      kind: "oral",
      room: "CCC, 111",
      presentingAuthor: "Nicholas Corson-Dosch",
      authorLine: "Corson-Dosch, Nicholas T [1]",
      doi: "10.1130/abs/2026AM-16121",
      sort: 1,
    });
    expect(t.affiliations).toEqual([
      "(1) U.S. Geological Survey, Upper Midwest Water Science Center, Madison, WI, USA",
    ]);
    expect(t.startsAt?.toISOString()).toBe("2026-10-12T19:35:00.000Z");
    expect(t.endsAt?.toISOString()).toBe("2026-10-12T19:55:00.000Z");
  });

  test("a poster gets its booth and its session's start, and no end", () => {
    const t = talk("15697");
    expect(t).toMatchObject({ kind: "poster", booth: "306", number: "52-1" });
    expect(t.startsAt?.toISOString()).toBe("2026-10-11T20:00:00.000Z");
    expect(t.endsAt).toBeNull();
  });

  test("abstract categories become tracks, on both talks and sessions", () => {
    expect(rows.tracks.map((t) => t.title)).toContain("Topical Sessions");
    expect(talk("16121").trackIds).toEqual(["topical-sessions"]);
    // Two of this session's talks (173-4, 173-11) are filed under Hydrogeology.
    expect(rows.sessions.find((x) => x.id === "96389")!.trackIds).toEqual([
      "discipline-hydrogeology",
      "topical-sessions",
    ]);
  });

  test("each presenter becomes a person linked to their abstract", () => {
    expect(rows.talkPeople).toContainEqual({ talkId: "16121", personId: "nicholas-corson-dosch" });
  });
});
