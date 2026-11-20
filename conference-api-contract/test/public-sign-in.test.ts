import { describe, expect, test } from "vitest";

import { OPERATIONS, ProblemSchema, RevokeRequestSchema, RevokeResponseSchema, TokenRequestSchema, TokenResponseSchema, buildOpenApi } from "../src/public/index";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ASSERTION = "eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJvcmctYXBzIn0.c2lnbmF0dXJl";
const request = {
  grant_type: "client_credentials",
  client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
  client_assertion: ASSERTION,
};

describe("partner sign-in (backend rules 12 and 14)", () => {
  test("is the OAuth 2 token endpoint: anyone may ask, and the proof is the partner's signed statement, not a token", () => {
    expect(OPERATIONS.issueToken).toMatchObject({ method: "POST", path: "/v1/oauth/token", audience: "public", permission: null, target: "none" });
  });

  test("takes only the client-credentials grant, proven with a signed statement (private_key_jwt), and only known scopes", () => {
    expect(TokenRequestSchema.parse({ ...request, scope: "matches:read talks:write" })).toMatchObject({ scope: "matches:read talks:write" });
    expect(TokenRequestSchema.safeParse(request).success).toBe(true);
    expect(TokenRequestSchema.safeParse({ ...request, grant_type: "password" }).success).toBe(false);
    expect(TokenRequestSchema.safeParse({ ...request, client_assertion_type: "urn:other" }).success).toBe(false);
    expect(TokenRequestSchema.safeParse({ ...request, client_assertion: "not a jwt" }).success).toBe(false);
    expect(TokenRequestSchema.safeParse({ ...request, scope: "matches:read everything" }).success).toBe(false);
    expect(TokenRequestSchema.safeParse({ ...request, client_secret: "s3cret" }).success).toBe(false);
  });

  test("answers an opaque token, a random string that reveals nothing, never the signed token behind it", () => {
    const answer = { access_token: "a".repeat(43), token_type: "Bearer", expires_in: 600, scope: "matches:read" };
    expect(TokenResponseSchema.parse(answer)).toEqual(answer);
    expect(TokenResponseSchema.safeParse({ ...answer, access_token: "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln" }).success).toBe(false);
  });

  test("the published specification states the form encoding OAuth 2 uses", () => {
    const op = (buildOpenApi() as Json).paths["/v1/oauth/token"].post;
    expect(Object.keys(op.requestBody.content)).toEqual(["application/x-www-form-urlencoded"]);
    expect(op.security).toEqual([]);
  });
});

describe("sign-in refusals speak OAuth 2 as well as problem details", () => {
  const refusal = { type: "/problems/sign-in-refused", title: "Refused", status: 401, requestId: "req_AAAAAAAAAAAAAAAAAAAAAA" };

  test("a refusal may carry the OAuth 2 error code that OAuth libraries read (RFC 6749 section 5.2)", () => {
    for (const error of ["invalid_request", "invalid_client", "invalid_scope", "unsupported_grant_type", "temporarily_unavailable"]) {
      expect(ProblemSchema.safeParse({ ...refusal, error }).success, error).toBe(true);
    }
  });

  test("only the codes OAuth 2 defines", () => {
    expect(ProblemSchema.safeParse({ ...refusal, error: "access_denied_forever" }).success).toBe(false);
  });
});

describe("a partner revokes its own token (backend rule 14, RFC 7009)", () => {
  test("by sending the token itself as an OAuth form, and the answer says nothing either way", () => {
    const op = OPERATIONS.revokeToken;
    expect(op).toMatchObject({ method: "POST", path: "/v1/oauth/revoke", audience: "public", request: { mediaType: "application/x-www-form-urlencoded" } });
    expect(RevokeRequestSchema.safeParse({ token: "A".repeat(43) }).success).toBe(true);
    expect(RevokeRequestSchema.safeParse({ token: "A".repeat(43), token_type_hint: "access_token" }).success).toBe(true);
    expect(RevokeResponseSchema.safeParse({}).success).toBe(true);
    expect(RevokeResponseSchema.safeParse({ revoked: true }).success).toBe(false);
  });

  test("only an opaque token can be named, and nothing else", () => {
    for (const body of [{}, { token: "short" }, { token: `${"A".repeat(42)}.` }, { token: "A".repeat(43), token_type_hint: "refresh_token" }, { token: "A".repeat(43), extra: "x" }]) {
      expect(RevokeRequestSchema.safeParse(body).success, JSON.stringify(body)).toBe(false);
    }
  });
});
