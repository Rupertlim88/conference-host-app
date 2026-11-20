import { z } from "zod";

import {
  AgreementIdSchema,
  AgreementSchema,
  ChangeAgreementRequestSchema,
  CreateAgreementRequestSchema,
  ListAgreementsResponseSchema,
  WithdrawAgreementRequestSchema,
} from "./agreements";
import {
  AttendanceReportRequestSchema,
  AttendanceReportResponseSchema,
  ErasedPersonSchema,
  ErasePersonRequestSchema,
} from "./attendance";
import {
  CredentialIdSchema,
  IssueCredentialRequestSchema,
  IssuedCredentialSchema,
  IssuerKeysSchema,
  StatusListCredentialSchema,
  VerifyCredentialRequestSchema,
  VerifyCredentialResponseSchema,
  VerifyPageSchema,
  WithdrawCredentialRequestSchema,
  WithdrawnCredentialSchema,
} from "./credentials";
import { ConferenceIdSchema, PartnerIdSchema } from "./ids";
import { DATA_KINDS, type DataKind, operational, pii, programme } from "./labels";
import {
  MatchesFromTextRequestSchema,
  MatchesFromTextResponseSchema,
  MatchesSearchRequestSchema,
  MatchesSearchResponseSchema,
} from "./matches";
import { ProblemSchema } from "./problem";
import { MatchSettingsSchema } from "./settings";
import type { PartnerKind, Scope } from "./scopes";
import { RevokeRequestSchema, RevokeResponseSchema, TokenRequestSchema, TokenResponseSchema } from "./sign-in";
import { TalksWriteRequestSchema, TalksWriteResponseSchema } from "./talks";


export interface OperationLimits {
  /** Largest request body accepted, in bytes. */
  maxBodyBytes: number;
  /** Requests one partner may make per minute, counted over one-minute windows. */
  requestsPerMinute: number;
  /** Requests one partner may make per UTC day, for each organiser it acts for, counted exactly. */
  requestsPerDay: number;
  /** Requests of this kind one partner may have running at the same time. */
  concurrentRequests: number;
  /** The API answers or gives up within this time. */
  timeoutSeconds: number;
}

/** Who may call an operation: a signed-in partner's server, or anyone (only the public credential checks). */
export type Audience = "partner" | "public";

/** What an operation acts on: a conference named in its path, the caller's own account, or nothing. */
export type Target = "conference" | "account" | "none";

export type Method = "GET" | "POST" | "PUT";

const BOTH: readonly PartnerKind[] = ["organiser", "provider"];
const ORGANISERS: readonly PartnerKind[] = ["organiser"];
const ANYONE: readonly PartnerKind[] = [];

/** What a response body is, when it is not JSON. */
export type MediaType = "application/json" | "application/vc+jwt" | "text/html";

/** What a request body is, when it is not JSON: OAuth 2's token request is a form (RFC 6749). */
export type RequestMediaType = "application/json" | "application/x-www-form-urlencoded";

interface Operation {
  method: Method;
  path: string;
  summary: string;
  audience: Audience;
  target: Target;
  /** The scope the caller's token must carry; null only for public operations. */
  permission: Scope | null;
  /** Which kinds of partner may call it; empty only for public operations. */
  partnerKinds: readonly PartnerKind[];
  /** Whether the request must carry an HTTP Message Signature (RFC 9421) over the whole message, made with one
   *  of the partner's registered keys, as highly sensitive requests must. */
  signed: boolean;
  limits: OperationLimits;
  /** Absent for reads, which send no body. */
  request?: { name: string; schema: z.ZodType; mediaType?: RequestMediaType };
  response: { name: string; schema: z.ZodType; mediaType?: MediaType };
  /** Set once the operation is retiring. It keeps every security fix until it is switched off. */
  retiring?: Retiring;
}

/** An operation that is retiring: when that was announced, when it is switched off, and what replaces it. Dates
 *  are YYYY-MM-DD, in UTC. */
export interface Retiring {
  announced: string;
  sunset: string;
  successor?: string;
}

/** Partners get this many months' notice before an operation is switched off. */
export const NOTICE_MONTHS = 6;

/** Whether a retirement gives at least NOTICE_MONTHS calendar months' notice. A month that is too short for the
 *  announced day counts from its last day. */
export function noticeIsEnough(retiring: Retiring): boolean {
  const [y, m, d] = retiring.announced.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + NOTICE_MONTHS, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const earliest = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay));
  return Date.parse(`${retiring.sunset}T00:00:00Z`) >= earliest;
}

/** Every name that may appear in braces in a path, and the check its value must pass. */
export const PATH_PARAMETERS: Record<string, z.ZodType> = {
  conference: programme(ConferenceIdSchema),
  agreement: operational(AgreementIdSchema),
  person: pii(PartnerIdSchema),
  credential: operational(CredentialIdSchema),
};

/** Protections every request meets before its operation's own limits. The backend enforces exactly these. */
/** What the front door, API Gateway, lets through: no request body over 10 MB, and no answer after 29 seconds.
 *  Every operation's own limits fit inside these, so the limits partners read are the ones that hold. */
export const FRONT_DOOR = { maxBodyBytes: 10_000_000, timeoutSeconds: 29 } as const;

export const PROTECTIONS = {
  /** Requests with a missing or unknown token one network address may make per minute. After that, every
   *  request from that address is refused until the allowance refills. */
  failedSignInsPerMinutePerAddress: 20,
  /** Requests for conferences a partner cannot reach, whether someone else's or not existing, it may make per
   *  minute. After that, every request from that partner is refused until the allowance refills. */
  unknownConferencesPerMinutePerPartner: 20,
} as const;

/** How much one conference or organiser may hold, counting everything kept. Reaching a limit refuses new data and
 *  never deletes any. The data layer enforces exactly these. */
export const BUSINESS_LIMITS = {
  talksPerConference: 50_000,
  /** Every past state of every talk is kept; each accepted change adds one. */
  keptTalkRevisionsPerConference: 2_000_000,
  /** Every accepted talks:write adds one. */
  programmeVersionsPerConference: 200_000,
  agreementsPerOrganiser: 1_000,
} as const;

/** The one source for every operation's path, permission and limits: the backend enforces these. */
export const OPERATIONS = {
  writeTalks: {
    method: "POST",
    path: "/v1/conferences/{conference}/talks:write",
    summary: "Send one talk, several, or the whole programme. All or nothing.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: false,
    target: "conference",
    permission: "talks:write",
    limits: { maxBodyBytes: 10_000_000, requestsPerMinute: 60, requestsPerDay: 10_000, concurrentRequests: 2, timeoutSeconds: 25 },
    request: { name: "TalksWriteRequest", schema: TalksWriteRequestSchema },
    response: { name: "TalksWriteResponse", schema: TalksWriteResponseSchema },
  },
  searchMatches: {
    method: "POST",
    path: "/v1/conferences/{conference}/matches:search",
    summary: "Get matches already worked out, by people or by liked talks.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: false,
    target: "conference",
    permission: "matches:read",
    limits: { maxBodyBytes: 64 * 1024, requestsPerMinute: 600, requestsPerDay: 200_000, concurrentRequests: 20, timeoutSeconds: 10 },
    request: { name: "MatchesSearchRequest", schema: MatchesSearchRequestSchema },
    response: { name: "MatchesSearchResponse", schema: MatchesSearchResponseSchema },
  },
  matchesFromText: {
    method: "POST",
    path: "/v1/conferences/{conference}/matches:fromText",
    summary: "Get matches for text a person enters, worked out on the spot.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: false,
    target: "conference",
    permission: "matches:read",
    limits: { maxBodyBytes: 64 * 1024, requestsPerMinute: 60, requestsPerDay: 20_000, concurrentRequests: 10, timeoutSeconds: 20 },
    request: { name: "MatchesFromTextRequest", schema: MatchesFromTextRequestSchema },
    response: { name: "MatchesFromTextResponse", schema: MatchesFromTextResponseSchema },
  },
  getMatchSettings: {
    method: "GET",
    path: "/v1/conferences/{conference}/matchSettings",
    summary: "Which matches the conference's attendees get, as its organiser chose.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: false,
    target: "conference",
    permission: "matches:read",
    limits: { maxBodyBytes: 0, requestsPerMinute: 60, requestsPerDay: 10_000, concurrentRequests: 2, timeoutSeconds: 10 },
    response: { name: "MatchSettings", schema: MatchSettingsSchema },
  },
  setMatchSettings: {
    method: "PUT",
    path: "/v1/conferences/{conference}/matchSettings",
    summary: "As the organiser, choose which kinds of match attendees get, and how many each person gets at most.",
    audience: "partner",
    partnerKinds: ORGANISERS,
    signed: false,
    target: "conference",
    permission: "settings:write",
    limits: { maxBodyBytes: 1024, requestsPerMinute: 30, requestsPerDay: 1_000, concurrentRequests: 1, timeoutSeconds: 10 },
    request: { name: "MatchSettingsRequest", schema: MatchSettingsSchema },
    response: { name: "MatchSettings", schema: MatchSettingsSchema },
  },
  reportAttendance: {
    method: "POST",
    path: "/v1/conferences/{conference}/attendance:report",
    summary: "Report who attended. Signed over the whole message; each report becomes one entry in a tamper-evident log.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: true,
    target: "conference",
    permission: "attendance:write",
    limits: { maxBodyBytes: 2 * 1024 * 1024, requestsPerMinute: 30, requestsPerDay: 1_000, concurrentRequests: 1, timeoutSeconds: 25 },
    request: { name: "AttendanceReportRequest", schema: AttendanceReportRequestSchema },
    response: { name: "AttendanceReportResponse", schema: AttendanceReportResponseSchema },
  },
  erasePerson: {
    method: "POST",
    path: "/v1/conferences/{conference}/people/{person}:erase",
    summary: "As the organiser, erase one person's data: their name, ORCID iD and attendance can never be read again.",
    audience: "partner",
    partnerKinds: ORGANISERS,
    signed: false,
    target: "conference",
    permission: "people:erase",
    limits: { maxBodyBytes: 1024, requestsPerMinute: 60, requestsPerDay: 5_000, concurrentRequests: 2, timeoutSeconds: 10 },
    request: { name: "ErasePersonRequest", schema: ErasePersonRequestSchema },
    response: { name: "ErasedPerson", schema: ErasedPersonSchema },
  },
  issueCredential: {
    method: "POST",
    path: "/v1/conferences/{conference}/credentials:issue",
    summary: "Issue one person's attendance credential, signed by us. Asking again gives the same credential.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: false,
    target: "conference",
    permission: "credentials:issue",
    limits: { maxBodyBytes: 1024, requestsPerMinute: 300, requestsPerDay: 50_000, concurrentRequests: 4, timeoutSeconds: 10 },
    request: { name: "IssueCredentialRequest", schema: IssueCredentialRequestSchema },
    response: { name: "IssuedCredential", schema: IssuedCredentialSchema },
  },
  withdrawCredential: {
    method: "POST",
    path: "/v1/conferences/{conference}/credentials/{credential}:withdraw",
    summary: "Withdraw a credential issued in error. The public status list shows it withdrawn from then on.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: false,
    target: "conference",
    permission: "credentials:issue",
    limits: { maxBodyBytes: 1024, requestsPerMinute: 60, requestsPerDay: 5_000, concurrentRequests: 2, timeoutSeconds: 10 },
    request: { name: "WithdrawCredentialRequest", schema: WithdrawCredentialRequestSchema },
    response: { name: "WithdrawnCredential", schema: WithdrawnCredentialSchema },
  },
  issueToken: {
    method: "POST",
    path: "/v1/oauth/token",
    summary: "Sign in a partner's system: OAuth 2 client credentials, proven with a statement it signed with its own key. Answers an opaque token.",
    audience: "public",
    partnerKinds: ANYONE,
    signed: false,
    target: "none",
    permission: null,
    limits: { maxBodyBytes: 16 * 1024, requestsPerMinute: 30, requestsPerDay: 5_000, concurrentRequests: 4, timeoutSeconds: 10 },
    request: { name: "TokenRequest", schema: TokenRequestSchema, mediaType: "application/x-www-form-urlencoded" },
    response: { name: "TokenResponse", schema: TokenResponseSchema },
  },
  revokeToken: {
    method: "POST",
    path: "/v1/oauth/revoke",
    summary: "Revoke one of the partner's own opaque tokens, at once (RFC 7009). The answer is the same whether or not the token was live.",
    audience: "public",
    partnerKinds: ANYONE,
    signed: false,
    target: "none",
    permission: null,
    limits: { maxBodyBytes: 4 * 1024, requestsPerMinute: 30, requestsPerDay: 5_000, concurrentRequests: 4, timeoutSeconds: 10 },
    request: { name: "RevokeRequest", schema: RevokeRequestSchema, mediaType: "application/x-www-form-urlencoded" },
    response: { name: "RevokeResponse", schema: RevokeResponseSchema },
  },
  getIssuerKeys: {
    method: "GET",
    path: "/.well-known/jwks.json",
    summary: "Our public keys, for anyone to check the credentials we issue without asking us.",
    audience: "public",
    partnerKinds: ANYONE,
    signed: false,
    target: "none",
    permission: null,
    limits: { maxBodyBytes: 0, requestsPerMinute: 600, requestsPerDay: 100_000, concurrentRequests: 8, timeoutSeconds: 5 },
    response: { name: "IssuerKeys", schema: IssuerKeysSchema },
  },
  getStatusList: {
    method: "GET",
    path: "/v1/credentials/status/{conference}",
    summary: "A conference's public status list (W3C Bitstring Status List), signed by us: which credentials were withdrawn.",
    audience: "public",
    partnerKinds: ANYONE,
    signed: false,
    target: "none",
    permission: null,
    limits: { maxBodyBytes: 0, requestsPerMinute: 600, requestsPerDay: 100_000, concurrentRequests: 8, timeoutSeconds: 10 },
    response: { name: "StatusListCredential", schema: StatusListCredentialSchema, mediaType: "application/vc+jwt" },
  },
  verifyCredential: {
    method: "POST",
    path: "/v1/credentials:verify",
    summary: "Check a credential someone chose to share: our signature, whether it was withdrawn, and its dates.",
    audience: "public",
    partnerKinds: ANYONE,
    signed: false,
    target: "none",
    permission: null,
    limits: { maxBodyBytes: 32 * 1024, requestsPerMinute: 30, requestsPerDay: 2_000, concurrentRequests: 2, timeoutSeconds: 10 },
    request: { name: "VerifyCredentialRequest", schema: VerifyCredentialRequestSchema },
    response: { name: "VerifyCredentialResponse", schema: VerifyCredentialResponseSchema },
  },
  verifyPage: {
    method: "GET",
    path: "/verify",
    summary: "The public page that checks a credential someone pastes. It cannot look anyone up.",
    audience: "public",
    partnerKinds: ANYONE,
    signed: false,
    target: "none",
    permission: null,
    limits: { maxBodyBytes: 0, requestsPerMinute: 120, requestsPerDay: 10_000, concurrentRequests: 4, timeoutSeconds: 5 },
    response: { name: "VerifyPage", schema: VerifyPageSchema, mediaType: "text/html" },
  },
  listAgreements: {
    method: "GET",
    path: "/v1/agreements",
    summary: "The agreements you gave as an organiser, or were given as an app provider.",
    audience: "partner",
    partnerKinds: BOTH,
    signed: false,
    target: "account",
    permission: "agreements:read",
    limits: { maxBodyBytes: 0, requestsPerMinute: 60, requestsPerDay: 5_000, concurrentRequests: 2, timeoutSeconds: 10 },
    response: { name: "ListAgreementsResponse", schema: ListAgreementsResponseSchema },
  },
  createAgreement: {
    method: "POST",
    path: "/v1/agreements",
    summary: "As an organiser, let an app provider act for you on some of your conferences, until a date.",
    audience: "partner",
    partnerKinds: ORGANISERS,
    signed: false,
    target: "account",
    permission: "agreements:write",
    limits: { maxBodyBytes: 16 * 1024, requestsPerMinute: 30, requestsPerDay: 1_000, concurrentRequests: 2, timeoutSeconds: 10 },
    request: { name: "CreateAgreementRequest", schema: CreateAgreementRequestSchema },
    response: { name: "Agreement", schema: AgreementSchema },
  },
  changeAgreement: {
    method: "PUT",
    path: "/v1/agreements/{agreement}",
    summary: "As its organiser, change which conferences and scopes an agreement covers, and when it ends.",
    audience: "partner",
    partnerKinds: ORGANISERS,
    signed: false,
    target: "account",
    permission: "agreements:write",
    limits: { maxBodyBytes: 16 * 1024, requestsPerMinute: 30, requestsPerDay: 1_000, concurrentRequests: 2, timeoutSeconds: 10 },
    request: { name: "ChangeAgreementRequest", schema: ChangeAgreementRequestSchema },
    response: { name: "Agreement", schema: AgreementSchema },
  },
  withdrawAgreement: {
    method: "POST",
    path: "/v1/agreements/{agreement}:withdraw",
    summary: "As its organiser, withdraw an agreement. The app provider is cut off from its next request.",
    audience: "partner",
    partnerKinds: ORGANISERS,
    signed: false,
    target: "account",
    permission: "agreements:write",
    limits: { maxBodyBytes: 1024, requestsPerMinute: 30, requestsPerDay: 1_000, concurrentRequests: 2, timeoutSeconds: 10 },
    request: { name: "WithdrawAgreementRequest", schema: WithdrawAgreementRequestSchema },
    response: { name: "Agreement", schema: AgreementSchema },
  },
} as const satisfies Record<string, Operation>;

const REFUSALS: Record<string, string> = {
  "400": "The request breaks the specification; nothing was applied. Do not retry unchanged.",
  "401": "No valid token, or, for a signed request, no valid signature. Sign in again, or sign the request, then retry.",
  "403": "The token lacks the permission this request needs, or the caller is blocked.",
  "404": "No such conference for this partner.",
  "413": "The request body is larger than this request allows.",
  "415": "The body is not JSON.",
  "409": "The conference holds as much as it may: nothing was applied. The business limits are in x-business-limits.",
  "429": "Too many requests: per minute, per day or at once from this partner, failed sign-ins from this address, or requests for conferences this partner cannot reach. Retry after the time in Retry-After.",
  "500": "An unexpected error. Safe to retry: sending the same request again gives the same result.",
  "503": "The API cannot answer in time just now. Safe to retry.",
};

/** The kinds of data an operation's request or answer holds, read from the labels on their fields. */
export function dataKindsOf(name: keyof typeof OPERATIONS): DataKind[] {
  const op: Operation = OPERATIONS[name];
  const found = new Set<DataKind>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "x-data-kind") found.add(value as DataKind);
      else visit(value);
    }
  };
  if (op.request) visit(z.toJSONSchema(op.request.schema, { io: "input" }));
  visit(z.toJSONSchema(op.response.schema, { io: "output" }));
  return [...found];
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** A JSON Schema as an OpenAPI component: the document-level keywords removed. */
function component(schema: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$schema" && key !== "$id"));
}

/** JSON Schema for each named schema, as OpenAPI components that refer to each other. */
function components(entries: { name: string; schema: z.ZodType }[], io: "input" | "output") {
  const registry = z.registry<{ id: string }>();
  for (const { name, schema } of entries) registry.add(schema, { id: name });
  const { schemas } = z.toJSONSchema(registry, {
    target: "draft-2020-12",
    io,
    uri: (id) => `#/components/schemas/${id}`,
  }) as { schemas: Record<string, Record<string, unknown>> };
  return Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [name, io === "output" ? withVisibility(component(schema)) : component(schema)]),
  );
}

/** Every field of an answer is labelled with who may see it: the caller, unless the zod contract marks it
 *  internal. The shared security layer removes internal fields before an answer leaves. */
function withVisibility(schema: Record<string, unknown>): Record<string, unknown> {
  const visit = (node: Record<string, unknown>) => {
    for (const field of Object.values((node.properties ?? {}) as Record<string, Record<string, unknown>>)) {
      field["x-visibility"] ??= "public";
      visit(field);
    }
    if (node.items) visit(node.items as Record<string, unknown>);
    for (const branch of (node.anyOf ?? []) as Record<string, unknown>[]) visit(branch);
  };
  visit(schema);
  return schema;
}

function parameterSchema(name: string): Record<string, unknown> {
  const schema = PATH_PARAMETERS[name];
  if (schema === undefined) throw new Error(`no check is declared for the path parameter {${name}}`);
  return component(z.toJSONSchema(schema, { target: "draft-2020-12" }));
}

const pathParameters = (path: string) =>
  [...path.matchAll(/\{([a-z]+)\}/g)].map(([, name]) => {
    const schema = parameterSchema(name!);
    return { name: name!, in: "path", required: true, "x-data-kind": schema["x-data-kind"], schema };
  });

/** The headers a signed request must carry. */
const SIGNATURE_HEADERS = [
  { name: "Signature-Input", description: "RFC 9421. Must cover @method, @authority, @path, content-digest and content-type, with created and keyid." },
  { name: "Signature", description: "RFC 9421: the signature, made with one of the partner's registered keys (ed25519 or ecdsa-p256-sha256)." },
  { name: "Content-Digest", description: "RFC 9530: the SHA-256 digest of the body, as sha-256=:<base64>:." },
].map((h) => ({ ...h, in: "header", required: true, "x-data-kind": "operational", schema: { type: "string", minLength: 1, maxLength: 2000 } }));

function publishedOperation(operationId: string, op: Operation): Record<string, unknown> {
  const parameters = [...pathParameters(op.path), ...(op.signed ? SIGNATURE_HEADERS : [])];
  return {
    operationId,
    summary: op.summary,
    "x-audience": op.audience,
    "x-target": op.target,
    "x-permission": op.permission,
    "x-partner-kinds": op.partnerKinds,
    "x-signed": op.signed,
    ...(op.retiring === undefined ? {} : { deprecated: true, "x-retiring": op.retiring }),
    "x-limits": op.limits,
    security: op.audience === "public" ? [] : [{ partnerOAuth: [op.permission] }],
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(op.request ? { requestBody: { required: true, content: { [op.request.mediaType ?? "application/json"]: { schema: ref(op.request.name) } } } } : {}),
    responses: {
      "200": { description: "Done.", content: { [op.response.mediaType ?? "application/json"]: { schema: ref(op.response.name) } } },
      ...Object.fromEntries(
        Object.entries(REFUSALS).map(([code, description]) => [
          code,
          { description, content: { "application/problem+json": { schema: ref("Problem") } } },
        ]),
      ),
    },
  };
}

/** The conference API's published specification, built from the zod contract. */
export function buildOpenApi(): Record<string, unknown> {
  const ops: [string, Operation][] = Object.entries(OPERATIONS);
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [operationId, op] of ops) (paths[op.path] ??= {})[op.method.toLowerCase()] = publishedOperation(operationId, op);
  return {
    openapi: "3.1.1",
    info: {
      title: "Conference API",
      version: "1.0.0",
      description: "Matching for conferences. Only partners' servers call it, with OAuth 2 client credentials.",
    },
    security: [{ partnerOAuth: [] }],
    "x-protections": PROTECTIONS,
    "x-data-kinds": DATA_KINDS,
    "x-versioning": {
      noticeMonths: NOTICE_MONTHS,
      policy:
        "A change that would break partners becomes a new version under a new path prefix, running alongside the old one. " +
        "A retiring operation is marked deprecated here, and its answers carry Deprecation and Sunset headers and a link to " +
        "its successor. It keeps every security fix until it is switched off.",
    },
    "x-business-limits": BUSINESS_LIMITS,
    paths,
    components: {
      schemas: {
        ...components(ops.flatMap(([, op]) => (op.request ? [op.request] : [])), "input"),
        ...components([...ops.map(([, op]) => op.response), { name: "Problem", schema: ProblemSchema }], "output"),
      },
      securitySchemes: {
        partnerOAuth: {
          type: "oauth2",
          description: "Short-lived tokens, bound to the partner's key.",
          flows: {
            clientCredentials: {
              tokenUrl: "/oauth/token",
              scopes: {
                "talks:write": "Send talks.",
                "matches:read": "Get matches.",
                "settings:write": "Change a conference's match settings, as its organiser.",
                "attendance:write": "Report who attended.",
                "credentials:issue": "Issue and withdraw attendance credentials.",
                "people:erase": "Erase a person's data, as the organiser.",
                "agreements:read": "See your agreements.",
                "agreements:write": "Make, change and withdraw agreements, as an organiser.",
              },
            },
          },
        },
      },
    },
  };
}

const OWNER = "conference API backend";

/** A body size in the unit it is set in: decimal megabytes (10 MB is API Gateway's limit), else binary units. */
const megabytes = (bytes: number) =>
  bytes % 1_000_000 === 0
    ? `${bytes / 1_000_000} MB`
    : bytes % (1024 * 1024) === 0
      ? `${bytes / (1024 * 1024)} MiB`
      : bytes % 1024 === 0
        ? `${bytes / 1024} KiB`
        : `${bytes} B`;

/** The list of every endpoint, for our team: who may call each, what it needs, who owns it and its limits, and
 *  every connection into, within and out of the API. Generated from the contract. */
export function endpointList(): string {
  const rows = Object.entries(OPERATIONS as Record<string, Operation>).map(([id, op]) => {
    const l = op.limits;
    const limits = `${op.request ? `${megabytes(l.maxBodyBytes)} body, ` : ""}${l.requestsPerMinute}/min, ${l.requestsPerDay.toLocaleString("en-US")}/day, ${l.concurrentRequests} at once, ${l.timeoutSeconds} s`;
    const kinds = op.partnerKinds.length === 0 ? "anyone" : op.partnerKinds.join(", ");
    const status = op.retiring === undefined ? "live" : `retiring, off ${op.retiring.sunset}`;
    return `| ${op.method} | \`${op.path}\` | ${id} | ${op.audience} | ${op.permission ?? "none"} | ${kinds} | ${op.signed ? "yes" : "no"} | ${OWNER} | ${limits} | ${status} |`;
  });
  return [
    "# Conference API endpoints",
    "",
    "Generated from the contract by `npm run emit --workspace=@repo/contracts`. Do not edit it by hand. For our team only: partners see the published specification.",
    "",
    "Limits are per partner, or per network address for public endpoints. A test fails if the backend serves any route that is not listed here, or misses one that is.",
    "",
    "| Method | Path | Operation | Audience | Permission | Partner kinds | Signed | Owner | Limits | Status |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## Connections",
    "",
    "- **Into the API:** partners' servers call the partner endpoints above. Anyone may call the public ones.",
    "- **Between the API's own parts:** the backend calls the control database's `api.*` functions and each conference database's `api.*` functions. The matching worker calls each conference database's `api.*` functions. The data layer's migrations define every one of them.",
    "- **Out of the API:** the matching worker calls the AI model providers its engine is configured for. The backend calls nothing outside the API.",
    "",
  ].join("\n");
}
