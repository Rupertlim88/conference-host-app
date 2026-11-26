import { TalkInputSchema, type TalksWriteRequest } from "@repo/contracts";
import { describe, expect, test } from "vitest";

import { RequestNotSent, type ConferenceApi } from "../src/matching-api";
import { syncProgramme, toPartnerTalk, type SyncTalk } from "../src/send";

const row = (id: string, over: Partial<SyncTalk> = {}): SyncTalk => ({
  id,
  sessionId: "S1",
  number: `1-${id}`,
  title: `Talk ${id}`,
  abstract: "Text.",
  kind: "oral",
  startsAt: new Date("2026-10-12T19:35:00Z"),
  endsAt: new Date("2026-10-12T19:55:00Z"),
  presentingAuthor: "Ada Author",
  trackIds: ["topical-sessions"],
  sessionTitle: "A session",
  sessionFormat: "Oral",
  sessionStart: "2026-10-12T13:30:00-06:00",
  ...over,
});

describe("toPartnerTalk", () => {
  test("maps a store talk to a valid contract talk", () => {
    const t = toPartnerTalk(row("16121"))!;
    expect(TalkInputSchema.safeParse(t).success).toBe(true);
    expect(t).toMatchObject({
      id: "16121",
      number: "1-16121",
      type: "oral",
      session: { id: "S1", title: "A session", type: "oral", start: "2026-10-12T13:30:00-06:00" },
      start: "2026-10-12T19:35:00.000Z",
      tracks: ["topical-sessions"],
      authors: [{ id: "ada-author", name: "Ada Author" }],
      presenters: ["ada-author"],
      status: "scheduled",
    });
  });

  test("a session with no start is sent without one", () => {
    const t = toPartnerTalk(row("7", { sessionStart: null }))!;
    expect(TalkInputSchema.safeParse(t).success).toBe(true);
    expect(t.session).toEqual({ id: "S1", title: "A session", type: "oral" });
  });

  test("breaks are not sent", () => {
    expect(toPartnerTalk(row("1", { kind: "break" }))).toBeNull();
  });

  test("cuts text the contract would refuse, and leaves out what is missing", () => {
    const t = toPartnerTalk(
      row("2", { title: "x".repeat(600), abstract: "y".repeat(12_000), number: "", presentingAuthor: "", sessionId: null }),
    )!;
    expect(TalkInputSchema.safeParse(t).success).toBe(true);
    expect(t.title).toHaveLength(500);
    expect(t.abstract).toHaveLength(10_000);
    expect(t).not.toHaveProperty("number");
    expect(t).not.toHaveProperty("authors");
    expect(t).not.toHaveProperty("session");
  });

  test("a talk whose end is not after its start is sent without its end", () => {
    const at = new Date("2026-01-27T15:00:00Z");
    const t = toPartnerTalk(row("3", { startsAt: at, endsAt: at }))!;
    expect(TalkInputSchema.safeParse(t).success).toBe(true);
    expect(t.start).toBe(at.toISOString());
    expect(t).not.toHaveProperty("end");
  });

  test("a talk with no abstract is not sent, since there is nothing to match it on", () => {
    expect(toPartnerTalk(row("4", { abstract: "  " }))).toBeNull();
  });

  test("control characters in scraped text become spaces", () => {
    const t = toPartnerTalk(row("5", { title: "Ice\u000bcores", abstract: "Line\u001fone\u0085two" }))!;
    expect(TalkInputSchema.safeParse(t).success).toBe(true);
    expect(t.title).toBe("Ice cores");
    expect(t.abstract).toBe("Line one two");
  });

  test("text is cut by Unicode characters, never inside one", () => {
    const t = toPartnerTalk(row("6", { title: `${"x".repeat(499)}\u{1F30D}\u{1F30D}` }))!;
    expect(TalkInputSchema.safeParse(t).success).toBe(true);
    expect([...t.title]).toHaveLength(500);
    expect(t.title.endsWith("\u{1F30D}")).toBe(true);
  });
});

describe("syncProgramme", () => {
  test("sends the programme in parts of 1,000 under one sync name, completing on the last", async () => {
    const sent: TalksWriteRequest[] = [];
    const api: ConferenceApi = {
      pooled: async () => ({ status: "unavailable" }),
    check: async () => ({ outcome: { kind: "not-set" }, ms: 0 }),
      writeTalks: async (req, signal) => {
        expect(signal).toBe(stop);
        sent.push(req);
        return { programmeVersion: `pv_${sent.length}`, added: req.talks.length, changed: 0, withdrawn: 0, unchanged: 0, matchingJob: null };
      },
    };
    const rows = [...Array.from({ length: 2500 }, (_, i) => row(String(i))), row("b", { kind: "break" })];
    const stop = new AbortController().signal;
    const result = await syncProgramme({ talksForSync: async () => rows }, api, "full-test", stop);
    expect(sent.map((r) => r.talks.length)).toEqual([1000, 1000, 500]);
    expect(sent.map((r) => r.sync)).toEqual(["full-test", "full-test", "full-test"]);
    expect(sent.map((r) => r.complete ?? false)).toEqual([false, false, true]);
    expect(result).toEqual({ sent: 2500, added: 2500, changed: 0, withdrawn: 0, unchanged: 0, programmeVersion: "pv_3" });
  });

  test("a talk that breaks the contract in a later part stops the send before any part is written", async () => {
    const sent: TalksWriteRequest[] = [];
    const api: ConferenceApi = {
      pooled: async () => ({ status: "unavailable" }),
      check: async () => ({ outcome: { kind: "not-set" }, ms: 0 }),
      writeTalks: async (req) => {
        sent.push(req);
        return { programmeVersion: "pv_x", added: req.talks.length, changed: 0, withdrawn: 0, unchanged: 0, matchingJob: null };
      },
    };
    // An id may start with a hyphen in the host app, but not at the conference API.
    const rows = [...Array.from({ length: 1500 }, (_, i) => row(String(i))), row("-1500")];
    await expect(syncProgramme({ talksForSync: async () => rows }, api, "checked-first")).rejects.toBeInstanceOf(RequestNotSent);
    expect(sent).toEqual([]);
  });
});
