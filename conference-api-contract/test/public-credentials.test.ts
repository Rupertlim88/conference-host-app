import { describe, expect, test } from "vitest";

import { INTERNAL_SCHEMAS } from "../src/internal/index";
import {
  IssueCredentialRequestSchema,
  IssuedCredentialSchema,
  IssuerKeysSchema,
  OPERATIONS,
  PATH_PARAMETERS,
  VerifyCredentialRequestSchema,
  VerifyCredentialResponseSchema,
  WithdrawnCredentialSchema,
  buildOpenApi,
} from "../src/public/index";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const spec = () => buildOpenApi() as Json;
const JWT = "eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS5leGFtcGxlIn0.c2lnbmF0dXJl";
const CREDENTIAL = "cred_8f3k2Qw9xLm0ZpT4vN7aBc";

describe("issuing and withdrawing attendance credentials", () => {
  test("a partner issues one person's credential, and asking again gives the same one", () => {
    expect(OPERATIONS.issueCredential).toMatchObject({
      method: "POST",
      path: "/v1/conferences/{conference}/credentials:issue",
      audience: "partner",
      permission: "credentials:issue",
      partnerKinds: ["organiser", "provider"],
    });
    expect(IssueCredentialRequestSchema.safeParse({ person: "P1" }).success).toBe(true);
    expect(IssueCredentialRequestSchema.safeParse({ person: "P1", name: "Ada Lovelace" }).success).toBe(false);
    const issued = { credential: CREDENTIAL, person: "P1", status: "active", issuedAt: "2027-03-20T10:00:00.000Z", jwt: JWT };
    expect(IssuedCredentialSchema.safeParse(issued).success).toBe(true);
    expect(IssuedCredentialSchema.safeParse({ ...issued, jwt: "not a token" }).success).toBe(false);
  });

  test("a credential withdrawn in error is named by its ID in the path", () => {
    expect(OPERATIONS.withdrawCredential).toMatchObject({
      method: "POST",
      path: "/v1/conferences/{conference}/credentials/{credential}:withdraw",
      permission: "credentials:issue",
    });
    expect(PATH_PARAMETERS.credential!.safeParse(CREDENTIAL).success).toBe(true);
    expect(PATH_PARAMETERS.credential!.safeParse("cred_1").success).toBe(false);
    const withdrawn = { credential: CREDENTIAL, person: "P1", status: "withdrawn", issuedAt: "2027-03-20T10:00:00.000Z", withdrawnAt: "2027-03-21T10:00:00.000Z" };
    expect(WithdrawnCredentialSchema.safeParse(withdrawn).success).toBe(true);
  });

  test("the signed credential is labelled personal data, since it names the person", () => {
    expect(spec().components.schemas.IssuedCredential.properties.jwt["x-data-kind"]).toBe("pii");
  });
});

describe("anyone can check a credential", () => {
  const PUBLIC = ["getIssuerKeys", "getStatusList", "verifyCredential", "verifyPage"] as const;

  test("the public key, the status lists, the check and the page need no sign-in", () => {
    for (const name of PUBLIC) {
      expect(OPERATIONS[name], name).toMatchObject({ audience: "public", permission: null, partnerKinds: [], target: "none", signed: false });
      const published = spec().paths[OPERATIONS[name].path][OPERATIONS[name].method.toLowerCase()];
      expect(published.security, name).toEqual([]);
    }
    expect(OPERATIONS.getIssuerKeys).toMatchObject({ method: "GET", path: "/.well-known/jwks.json" });
    expect(OPERATIONS.getStatusList).toMatchObject({ method: "GET", path: "/v1/credentials/status/{conference}" });
    expect(OPERATIONS.verifyCredential).toMatchObject({ method: "POST", path: "/v1/credentials:verify" });
    expect(OPERATIONS.verifyPage).toMatchObject({ method: "GET", path: "/verify" });
  });

  test("a status list is served as a signed credential, the page as HTML, and the rest as JSON", () => {
    const paths = spec().paths;
    expect(Object.keys(paths["/v1/credentials/status/{conference}"].get.responses["200"].content)).toEqual(["application/vc+jwt"]);
    expect(Object.keys(paths["/verify"].get.responses["200"].content)).toEqual(["text/html"]);
    expect(Object.keys(paths["/.well-known/jwks.json"].get.responses["200"].content)).toEqual(["application/json"]);
  });

  test("a check takes only the credential someone chose to share: nothing can be looked up by name", () => {
    expect(VerifyCredentialRequestSchema.safeParse({ credential: JWT }).success).toBe(true);
    expect(VerifyCredentialRequestSchema.safeParse({ name: "Ada Lovelace" }).success).toBe(false);
    expect(VerifyCredentialRequestSchema.safeParse({ credential: JWT, name: "Ada Lovelace" }).success).toBe(false);
  });

  test("the answer says whether it holds and why, and what the credential says only once its signature is ours", () => {
    const valid = {
      valid: true,
      checks: { signature: "valid", status: "active", dates: "current" },
      says: {
        name: "Ada Lovelace",
        orcid: "0000-0002-1825-0097",
        conference: "APS March Meeting 2027",
        attendedFrom: "2027-03-15",
        attendedUntil: "2027-03-19",
        issuer: "Conference API",
        issuedAt: "2027-03-20T10:00:00.000Z",
      },
    };
    expect(VerifyCredentialResponseSchema.safeParse(valid).success).toBe(true);
    expect(VerifyCredentialResponseSchema.safeParse({ valid: false, checks: { signature: "invalid" } }).success).toBe(true);
    expect(VerifyCredentialResponseSchema.safeParse({ valid: false, checks: { signature: "invalid" }, says: valid.says }).success).toBe(false);
  });

  test("our issuer key is published as a public ES256 key, never with its private part", () => {
    const key = { kty: "EC", crv: "P-256", x: "A".repeat(43), y: "B".repeat(43), kid: "k".repeat(43), alg: "ES256", use: "sig" };
    expect(IssuerKeysSchema.safeParse({ keys: [key] }).success).toBe(true);
    expect(IssuerKeysSchema.safeParse({ keys: [{ ...key, d: "C".repeat(43) }] }).success).toBe(false);
  });
});

describe("what the backend and the conference's database pass each other", () => {
  test("a person's latest attendance line comes back sealed, or that they were erased or never reported", () => {
    const sealed = Buffer.alloc(34, 7).toString("base64");
    const found = { wrappedKey: Buffer.alloc(73, 9).toString("base64"), line: { name: sealed, attended: sealed } };
    expect(INTERNAL_SCHEMAS.person_attendance.safeParse(found).success).toBe(true);
    expect(INTERNAL_SCHEMAS.person_attendance.safeParse({ erased: true }).success).toBe(true);
    expect(INTERNAL_SCHEMAS.person_attendance.safeParse({ unknown: true }).success).toBe(true);
    expect(INTERNAL_SCHEMAS.person_attendance.safeParse({ ...found, line: { name: "Ada Lovelace", attended: sealed } }).success).toBe(false);
  });

  test("a status index stays within the list's 131,072 entries", () => {
    const record = { credential: CREDENTIAL, statusIndex: 131_072, issuedAt: "2027-03-20T10:00:00.000Z", status: "active" };
    expect(INTERNAL_SCHEMAS.credential_record.safeParse(record).success).toBe(false);
    expect(INTERNAL_SCHEMAS.credential_record.safeParse({ ...record, statusIndex: 0 }).success).toBe(true);
  });
});
