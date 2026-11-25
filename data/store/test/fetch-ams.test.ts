import { describe, expect, test } from "vitest";

import { publicProgramme, type AmsFiles } from "../src/fetch-ams";

// Shapes from AMS's 107th Annual Meeting API, cut down to the fields each test needs.
const paper = (id: string, session: string, over: Record<string, unknown> = {}) => ({
  id,
  FinalNumber: "5.1",
  Title: `Paper ${id}`,
  Abstract: "Write to author@example.edu for the data.",
  Type: "Oral",
  ProgramCode: "LIGHTNING",
  ParentList_ParentEntries: [`Session/${session}`, "Program/1976"],
  ParentList_SlotData: [`SlotData/Paper${id}_Slot1`],
  ParentList_Day: ["Day/Program1976_2027-01-12"],
  Rating: "4",
  Comments: "Please move me",
  Withdrawn: "",
  WebprogramExclude: "0",
  ...over,
});
const session = (id: string, papers: string[], over: Record<string, unknown> = {}) => ({
  id,
  FinalNumber: "Session 5",
  Title: `Session ${id}`,
  label: "Session",
  ProgramCode: "LIGHTNING",
  ChildList_Paper: papers.map((p) => `Paper/${p}`),
  ParentList_ParentEntries: ["Program/1976"],
  ParentList_Day: ["Day/Program1976_2027-01-12"],
  SubTitle: "chair@example.org",
  BillTo: "x",
  Withdrawn: "",
  WebprogramExclude: "0",
  ...over,
});
const slot = (entry: string) => ({ id: `${entry.replace("/", "")}_Slot1`, Entryid: entry, Entry_Title: entry, Room_Name: "405" });
const program = (id: string, code: string, sessions: string[], papers: string[] = []) => ({
  id,
  ProgramCode: code,
  Title: code,
  ChildList_Session: sessions.map((s) => `Session/${s}`),
  ChildList_Paper: papers.map((p) => `Paper/${p}`),
  ChildList_Day: [`Day/Program${id}_2027-01-12`],
});

const files = (over: Partial<AmsFiles> = {}): AmsFiles => ({
  Paper: [paper("487641", "76096"), paper("496187", "76096")],
  Session: [session("76096", ["487641", "496187"])],
  SlotData: [slot("Session/76096"), slot("Paper/487641"), slot("Paper/496187")],
  Program: [program("1976", "LIGHTNING", ["76096"])],
  ...over,
});
const ids = (rows: Record<string, unknown>[]) => rows.map((r) => r.id);

describe("publicProgramme", () => {
  test("keeps only the fields the public programme shows", () => {
    const out = publicProgramme(files());
    expect(out.Paper[0]).toEqual({
      id: "487641",
      FinalNumber: "5.1",
      Title: "Paper 487641",
      Abstract: "Write to author@example.edu for the data.",
      Type: "Oral",
      ProgramCode: "LIGHTNING",
      ParentList_ParentEntries: ["Session/76096", "Program/1976"],
      ParentList_SlotData: ["SlotData/Paper487641_Slot1"],
    });
    expect(Object.keys(out.Session[0]!).sort()).toEqual(["ChildList_Paper", "FinalNumber", "ParentList_ParentEntries", "ProgramCode", "Title", "id", "label"]);
    expect(Object.keys(out.Program[0]!).sort()).toEqual(["ChildList_Paper", "ChildList_Session", "ProgramCode", "Title", "id"]);
  });

  test("drops a withdrawn paper with its slot, and the session's list stops naming it", () => {
    const out = publicProgramme(files({ Paper: [paper("487641", "76096", { Withdrawn: "w" }), paper("496187", "76096")] }));
    expect(ids(out.Paper)).toEqual(["496187"]);
    expect(out.SlotData.map((s) => s.Entryid)).toEqual(["Session/76096", "Paper/496187"]);
    expect(out.Session[0]!.ChildList_Paper).toEqual(["Paper/496187"]);
  });

  test("keeps a session AMS marks i, which its own app still shows", () => {
    const out = publicProgramme(files({ Session: [session("76096", ["487641", "496187"], { Withdrawn: "i" })] }));
    expect(ids(out.Session)).toEqual(["76096"]);
    expect(ids(out.Paper)).toEqual(["487641", "496187"]);
  });

  test("drops a session the web programme leaves out, with its papers and slots", () => {
    const out = publicProgramme(files({ Session: [session("76096", ["487641", "496187"], { WebprogramExclude: "1" })] }));
    expect(out.Session).toEqual([]);
    expect(out.Paper).toEqual([]);
    expect(out.SlotData).toEqual([]);
    expect(out.Program[0]!.ChildList_Session).toEqual([]);
  });

  test("drops a paper the web programme leaves out", () => {
    const out = publicProgramme(files({ Paper: [paper("487641", "76096", { WebprogramExclude: "1" }), paper("496187", "76096")] }));
    expect(ids(out.Paper)).toEqual(["496187"]);
  });

  test("drops the exhibit hall, sponsor and waste-basket programmes and every session in them", () => {
    const booth = session("75215", [], { label: "Exhibit", ProgramCode: "EXHIBITHALL", FinalNumber: "Session " });
    const sponsor = session("77001", [], { label: "Sponsor", ProgramCode: "SPONSORS", FinalNumber: "Session " });
    const out = publicProgramme(
      files({
        Session: [session("76096", ["487641", "496187"]), booth, sponsor],
        SlotData: [slot("Session/76096"), slot("Paper/487641"), slot("Paper/496187"), slot("Session/75215")],
        Program: [program("1976", "LIGHTNING", ["76096"]), program("1947", "EXHIBITHALL", ["75215"]), program("2001", "SPONSORS", ["77001"]), program("1945", "TRASH", [])],
      }),
    );
    expect(ids(out.Session)).toEqual(["76096"]);
    expect(ids(out.Program)).toEqual(["1976"]);
    expect(out.SlotData.map((s) => s.Entryid)).not.toContain("Session/75215");
  });

  test("drops hidden markup from authors' rich text, where an editor can leave an email", () => {
    // Paper 493109's abstract carried its author's email in 453 hidden attributes like this one.
    const abstract = '<div><span attribution="{"id":"author@example.edu","name":"Author, A."}">Accurate</span> <a href="https://example.org/x">data</a><br/></div>';
    const chairs = "<div class='topdisplay'><span class='topdisplay_role'>Chair:</span><span class='topdisplay_people'>A. Chair</span></div>";
    const out = publicProgramme(
      files({
        Paper: [paper("487641", "76096", { Abstract: abstract }), paper("496187", "76096")],
        Session: [session("76096", ["487641", "496187"], { Description: '<p data-ccp-props="{}" style="x">About</p>', TopDisplay: chairs })],
      }),
    );
    expect(out.Paper[0]!.Abstract).toBe("<div><span>Accurate</span> <a>data</a><br></div>");
    expect(out.Session[0]!.Description).toBe("<p>About</p>");
    expect(out.Session[0]!.TopDisplay).toBe(chairs);
  });

  test("keeps a paper that belongs to no session", () => {
    const keynote = paper("498894", "none", { ParentList_ParentEntries: ["Program/1976"] });
    const out = publicProgramme(files({ Paper: [paper("487641", "76096"), keynote] }));
    expect(ids(out.Paper)).toEqual(["487641", "498894"]);
  });
});
