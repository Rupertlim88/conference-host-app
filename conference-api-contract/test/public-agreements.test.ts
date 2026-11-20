import { describe, expect, test } from "vitest";

import {
  AgreementSchema,
  ChangeAgreementRequestSchema,
  CreateAgreementRequestSchema,
  ListAgreementsResponseSchema,
  OPERATIONS,
  PATH_PARAMETERS,
  ScopeSchema,
} from "../src/public/index";

const valid = {
  provider: "app-events",
  conferences: ["aps-2027"],
  scopes: ["matches:read", "talks:write"],
  endsAt: "2027-03-31T23:59:59Z",
};

const agreement = {
  id: "agr_8f3k2Qw9xLm0ZpT4vN7aBc",
  organiser: { id: "org-aps", name: "American Physical Society" },
  provider: { id: "app-events", name: "Events App Ltd" },
  conferences: ["aps-2027"],
  scopes: ["matches:read"],
  endsAt: "2027-03-31T23:59:59.000Z",
  status: "active",
  createdAt: "2026-11-16T10:00:00.000Z",
  changedAt: "2026-11-16T10:00:00.000Z",
};

describe("scopes", () => {
  test("each scope names an action a token can be allowed", () => {
    expect(ScopeSchema.options).toEqual([
      "talks:write",
      "matches:read",
      "settings:write",
      "attendance:write",
      "credentials:issue",
      "people:erase",
      "agreements:read",
      "agreements:write",
    ]);
  });
});

describe("agreements", () => {
  test("an organiser offers a provider some conferences and scopes, until a date with its offset from UTC", () => {
    expect(CreateAgreementRequestSchema.safeParse(valid).success).toBe(true);
    expect(CreateAgreementRequestSchema.safeParse({ ...valid, endsAt: "2027-03-31T23:59:59-05:00" }).success).toBe(true);
    const change: Record<string, unknown> = { ...valid };
    delete change.provider;
    expect(ChangeAgreementRequestSchema.safeParse(change).success).toBe(true);
    expect(ChangeAgreementRequestSchema.safeParse(valid).success).toBe(false);
  });

  test("an agreement can only give what an app provider may ever be given", () => {
    for (const scope of ["settings:write", "people:erase", "agreements:write", "agreements:read"]) {
      expect(CreateAgreementRequestSchema.safeParse({ ...valid, scopes: [scope] }).success, scope).toBe(false);
    }
  });

  test("terms that cannot be meant are refused", () => {
    for (const bad of [
      { ...valid, conferences: [] },
      { ...valid, conferences: ["aps-2027", "aps-2027"] },
      { ...valid, conferences: Array.from({ length: 101 }, (_, i) => `c${i}x`) },
      { ...valid, scopes: [] },
      { ...valid, scopes: ["matches:read", "matches:read"] },
      { ...valid, endsAt: "2027-03-31" },
      { ...valid, endsAt: "2027-03-31T23:59:59" },
      { ...valid, extra: true },
    ]) {
      expect(CreateAgreementRequestSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  test("an agreement as both partners see it, with each other's names and its status", () => {
    expect(AgreementSchema.safeParse(agreement).success).toBe(true);
    expect(AgreementSchema.safeParse({ ...agreement, status: "withdrawn", withdrawnAt: agreement.changedAt }).success).toBe(true);
    expect(AgreementSchema.safeParse({ ...agreement, status: "paused" }).success).toBe(false);
    expect(ListAgreementsResponseSchema.safeParse({ agreements: [agreement] }).success).toBe(true);
  });

  test("the four operations: anyone with an agreement can read, only organisers change", () => {
    expect(OPERATIONS.listAgreements).toMatchObject({ method: "GET", path: "/v1/agreements", target: "account", permission: "agreements:read" });
    expect(OPERATIONS.createAgreement).toMatchObject({ method: "POST", path: "/v1/agreements", target: "account", permission: "agreements:write" });
    expect(OPERATIONS.changeAgreement).toMatchObject({ method: "PUT", path: "/v1/agreements/{agreement}", permission: "agreements:write" });
    expect(OPERATIONS.withdrawAgreement).toMatchObject({
      method: "POST",
      path: "/v1/agreements/{agreement}:withdraw",
      permission: "agreements:write",
    });
    expect(OPERATIONS.listAgreements.partnerKinds).toEqual(["organiser", "provider"]);
    for (const op of [OPERATIONS.createAgreement, OPERATIONS.changeAgreement, OPERATIONS.withdrawAgreement]) {
      expect(op.partnerKinds).toEqual(["organiser"]);
    }
    expect(PATH_PARAMETERS.agreement!.safeParse("agr_8f3k2Qw9xLm0ZpT4vN7aBc").success).toBe(true);
    expect(PATH_PARAMETERS.agreement!.safeParse("agr_short").success).toBe(false);
  });
});
