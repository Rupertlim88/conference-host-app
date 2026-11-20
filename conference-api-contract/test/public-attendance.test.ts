import { describe, expect, test } from "vitest";

import { INTERNAL_SCHEMAS } from "../src/internal/index";
import { AttendanceReportRequestSchema, AttendanceReportResponseSchema, OPERATIONS, PATH_PARAMETERS, buildOpenApi } from "../src/public/index";

const report = {
  reportId: "R-2027-03-16",
  attendees: [
    { person: "P1", name: "Ada Lovelace", orcid: "0000-0002-1825-0097", attended: true },
    { person: "P2", name: "Charles Babbage", attended: false },
  ],
};

describe("attendance reports", () => {
  test("a partner reports who attended, by its own ID for each person", () => {
    expect(AttendanceReportRequestSchema.safeParse(report).success).toBe(true);
    expect(AttendanceReportRequestSchema.safeParse({ ...report, corrects: "att_8f3k2Qw9xLm0ZpT4vN7aBc" }).success).toBe(true);
  });

  test("reports that cannot be meant are refused", () => {
    for (const bad of [
      { ...report, attendees: [] },
      { ...report, attendees: [report.attendees[0], report.attendees[0]] },
      { ...report, attendees: [{ ...report.attendees[0], orcid: "0000-0002-1825-0098" }] },
      { ...report, attendees: [{ ...report.attendees[0], attended: "yes" }] },
      { ...report, corrects: "att_short" },
      { ...report, extra: 1 },
    ]) {
      expect(AttendanceReportRequestSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  test("names and ORCID iDs are labelled personal data", () => {
    const spec = buildOpenApi() as { components: { schemas: Record<string, { properties: Record<string, { items: { properties: Record<string, { "x-data-kind"?: string }> } }> }> } };
    const attendee = spec.components.schemas.AttendanceReportRequest!.properties.attendees!.items.properties;
    expect(attendee.name!["x-data-kind"]).toBe("pii");
    expect(attendee.orcid!["x-data-kind"]).toBe("pii");
  });

  test("the report must be signed over the whole message, and the specification says so", () => {
    expect(OPERATIONS.reportAttendance).toMatchObject({
      method: "POST",
      path: "/v1/conferences/{conference}/attendance:report",
      permission: "attendance:write",
      signed: true,
    });
    const spec = buildOpenApi() as { paths: Record<string, Record<string, { "x-signed"?: boolean; parameters: { name: string; in: string }[] }>> };
    const published = spec.paths["/v1/conferences/{conference}/attendance:report"]!.post!;
    expect(published["x-signed"]).toBe(true);
    expect(published.parameters.filter((p) => p.in === "header").map((p) => p.name)).toEqual(["Signature-Input", "Signature", "Content-Digest"]);
    expect(OPERATIONS.writeTalks.signed).toBe(false);
  });

  test("the answer names the new entry, its place in the log and when it was recorded", () => {
    const answer = { entry: "att_8f3k2Qw9xLm0ZpT4vN7aBc", sequence: 1, recordedAt: "2026-11-16T10:00:00.000Z", attendees: 2 };
    expect(AttendanceReportResponseSchema.safeParse(answer).success).toBe(true);
  });
});

describe("erasing a person", () => {
  test("only the organiser erases, by the person's ID in the path", () => {
    expect(OPERATIONS.erasePerson).toMatchObject({
      method: "POST",
      path: "/v1/conferences/{conference}/people/{person}:erase",
      permission: "people:erase",
      partnerKinds: ["organiser"],
    });
    expect(PATH_PARAMETERS.person!.safeParse("P1").success).toBe(true);
  });

  test("the record command carries only sealed fields and wrapped keys", () => {
    const sealed = Buffer.alloc(34, 7).toString("base64");
    const command = {
      reportId: "R1",
      actor: { partner: "app-events", organiser: "org-aps" },
      signature: {
        keyId: "key-1",
        signatureInput: 'sig1=("@method" "@authority" "@path" "content-digest" "content-type");created=1;keyid="key-1"',
        signature: `sig1=:${Buffer.alloc(64, 1).toString("base64")}:`,
        contentDigest: `sha-256=:${Buffer.alloc(32, 2).toString("base64")}:`,
      },
      newKeys: { P1: Buffer.alloc(73, 9).toString("base64") },
      lines: [{ person: "P1", name: sealed, attended: sealed }],
    };
    const schema = INTERNAL_SCHEMAS.record_attendance_command;
    expect(schema.safeParse(command).success).toBe(true);
    for (const plain of ["Ada", "Ada Lovelace", "true"]) {
      expect(schema.safeParse({ ...command, lines: [{ ...command.lines[0], name: plain }] }).success, plain).toBe(false);
    }
    expect(schema.safeParse({ ...command, newKeys: { P1: "not a key" } }).success).toBe(false);
  });

  test("the database answers a recorded entry, every problem, or that people's keys changed meanwhile", () => {
    const schema = INTERNAL_SCHEMAS.record_attendance_outcome;
    const result = { entry: "att_8f3k2Qw9xLm0ZpT4vN7aBc", sequence: 3, recordedAt: "2026-11-16T10:00:00.000Z", attendees: 2 };
    const hash = Buffer.alloc(32, 4).toString("base64");
    expect(schema.safeParse({ ok: true, result, hash, stamped: false }).success).toBe(true);
    expect(schema.safeParse({ ok: true, result, stamped: false }).success, "the entry's hash, for its timestamp").toBe(false);
    expect(schema.safeParse({ ok: false, errors: [{ field: "attendees", problem: "P1 was erased" }] }).success).toBe(true);
    expect(schema.safeParse({ ok: false, keysChanged: true }).success).toBe(true);
    expect(schema.safeParse({ ok: false }).success).toBe(false);
  });

  test("people's stored keys come back wrapped, or marked erased", () => {
    const schema = INTERNAL_SCHEMAS.attendee_keys;
    expect(schema.safeParse({ P1: { wrappedKey: Buffer.alloc(73, 9).toString("base64") }, P2: { erased: true } }).success).toBe(true);
    expect(schema.safeParse({ P1: { wrappedKey: "Ada" } }).success).toBe(false);
  });
});
