import { z } from "zod";

import { ConferenceIdSchema } from "./ids";
import {
  MatchesFromTextRequestSchema,
  MatchesFromTextResponseSchema,
  MatchesSearchRequestSchema,
  MatchesSearchResponseSchema,
} from "./matches";
import { ProblemSchema } from "./problem";
import { MatchSettingsSchema } from "./settings";
import { TalksWriteRequestSchema, TalksWriteResponseSchema } from "./talks";

export interface OperationLimits {
  /** The largest request body accepted, in bytes. */
  maxBodyBytes: number;
  /** Requests one key may make per minute, counted over one-minute windows. */
  requestsPerMinute: number;
  /** Requests one partner may make per UTC day on one organiser's conferences, counted exactly. */
  requestsPerDay: number;
  /** Requests of this kind one key may have running at once. */
  concurrentRequests: number;
  /** The API answers, or gives up, within this time. */
  timeoutSeconds: number;
}

export type Method = "GET" | "POST" | "PUT";

interface Operation {
  method: Method;
  path: string;
  summary: string;
  limits: OperationLimits;
  /** Left out for reads, which send no body. */
  request?: { name: string; schema: z.ZodType };
  response: { name: string; schema: z.ZodType };
  /** Set once the operation is retiring. It keeps every security fix until it is switched off. */
  retiring?: Retiring;
}

/** An operation being retired: when that was announced, when it is switched off, and what replaces it. Dates are
 *  YYYY-MM-DD in UTC. */
export interface Retiring {
  announced: string;
  sunset: string;
  successor?: string;
}

/** Partners get this many months' notice before an operation is switched off. */
export const NOTICE_MONTHS = 6;

/** Whether a retirement gives at least NOTICE_MONTHS calendar months' notice. When the month the notice ends in is
 *  too short for the announced day, the notice ends on that month's last day. */
export function noticeIsEnough(retiring: Retiring): boolean {
  const [year, month, day] = retiring.announced.split("-").map(Number) as [number, number, number];
  const endMonth = new Date(Date.UTC(year, month - 1 + NOTICE_MONTHS, 1));
  const daysInEndMonth = new Date(Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const earliestSunset = Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth(), Math.min(day, daysInEndMonth));
  return Date.parse(`${retiring.sunset}T00:00:00Z`) >= earliestSunset;
}

/** Every name that may appear in braces in a path, and the check its value must pass. */
export const PATH_PARAMETERS: Record<string, z.ZodType> = {
  conference: ConferenceIdSchema,
};

/** What the front door, API Gateway, lets through: no request body over 10 MB, and no answer after 29 seconds.
 *  Every operation's own limits fit inside these, so the limits partners read are the ones that hold. */
export const FRONT_DOOR = { maxBodyBytes: 10_000_000, timeoutSeconds: 29 } as const;

/** Protections every request meets before its operation's own limits. The backend enforces exactly these. */
export const PROTECTIONS = {
  /** Requests one network address may make per minute, counted before its key is checked. */
  requestsPerMinutePerAddress: 1_200,
  /** Requests with a missing, malformed, unknown, expired or cancelled key that one network address may make per
   *  minute. Past that, every request from the address is refused until the allowance refills. */
  failedKeyChecksPerMinutePerAddress: 20,
} as const;

/** How much one conference may hold, counting everything kept. Reaching a limit refuses new data and
 *  never deletes any. The data layer enforces exactly these. */
export const BUSINESS_LIMITS = {
  talksPerConference: 50_000,
  /** Every past state of every talk is kept; each accepted change adds one. */
  keptTalkRevisionsPerConference: 2_000_000,
  /** Every accepted talks:write adds one. */
  programmeVersionsPerConference: 200_000,
} as const;

const KiB = 1024;

function limits(
  maxBodyBytes: number,
  requestsPerMinute: number,
  requestsPerDay: number,
  concurrentRequests: number,
  timeoutSeconds: number,
): OperationLimits {
  return { maxBodyBytes, requestsPerMinute, requestsPerDay, concurrentRequests, timeoutSeconds };
}

/** The one source of every operation's path and limits. The backend enforces these. */
export const OPERATIONS = {
  writeTalks: {
    method: "POST",
    path: "/v1/conferences/{conference}/talks:write",
    summary: "Send one talk, several, or the whole programme. All or nothing.",
    limits: limits(10_000_000, 60, 10_000, 2, 25),
    request: { name: "TalksWriteRequest", schema: TalksWriteRequestSchema },
    response: { name: "TalksWriteResponse", schema: TalksWriteResponseSchema },
  },
  searchMatches: {
    method: "POST",
    path: "/v1/conferences/{conference}/matches:search",
    summary: "Get matches already worked out, by people or by liked talks.",
    limits: limits(64 * KiB, 600, 200_000, 20, 10),
    request: { name: "MatchesSearchRequest", schema: MatchesSearchRequestSchema },
    response: { name: "MatchesSearchResponse", schema: MatchesSearchResponseSchema },
  },
  matchesFromText: {
    method: "POST",
    path: "/v1/conferences/{conference}/matches:fromText",
    summary: "Get matches for text a person enters, worked out on the spot.",
    limits: limits(64 * KiB, 60, 20_000, 10, 20),
    request: { name: "MatchesFromTextRequest", schema: MatchesFromTextRequestSchema },
    response: { name: "MatchesFromTextResponse", schema: MatchesFromTextResponseSchema },
  },
  getMatchSettings: {
    method: "GET",
    path: "/v1/conferences/{conference}/matchSettings",
    summary: "Which matches the conference's attendees get, as its organiser chose.",
    limits: limits(0, 60, 10_000, 2, 10),
    response: { name: "MatchSettings", schema: MatchSettingsSchema },
  },
  setMatchSettings: {
    method: "PUT",
    path: "/v1/conferences/{conference}/matchSettings",
    summary: "Choose, for the organiser, which kinds of match attendees get, and how many each person gets at most.",
    limits: limits(1 * KiB, 30, 1_000, 1, 10),
    request: { name: "MatchSettingsRequest", schema: MatchSettingsSchema },
    response: { name: "MatchSettings", schema: MatchSettingsSchema },
  },
} as const satisfies Record<string, Operation>;

/** What each refusal means, as the specification documents it. */
const REFUSALS: Record<string, string> = {
  "400": "The request breaks the specification; nothing was applied. Do not retry unchanged.",
  "401": "No valid API key: the Authorization header must carry this conference's live key, as Bearer <key>.",
  "404": "No such conference for this key. Asking for any conference but the key's own gets this same answer.",
  "409": "The conference holds as much as it may: nothing was applied. The business limits are in x-business-limits.",
  "413": "The request body is larger than this request allows.",
  "415": "The body is not JSON in UTF-8, uncompressed.",
  "429": "Too many requests: per minute, per day or at once for this key, from this network address, or failed key checks from this address. Retry after the time in Retry-After.",
  "500": "An unexpected error. Safe to retry: sending the same request again gives the same result.",
  "503": "The API cannot answer in time just now. Safe to retry.",
};

const refTo = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** A JSON Schema turned into an OpenAPI component: the document-level keywords dropped. */
function asComponent(schema: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$schema" && key !== "$id"));
}

/** Marks every field of an answer with who may see it: the caller, unless the contract marks it internal. The
 *  shared security layer removes internal fields before an answer leaves the API. */
function markVisibility(node: Record<string, unknown>): Record<string, unknown> {
  for (const field of Object.values((node.properties ?? {}) as Record<string, Record<string, unknown>>)) {
    field["x-visibility"] ??= "public";
    markVisibility(field);
  }
  if (node.items) markVisibility(node.items as Record<string, unknown>);
  for (const branch of (node.anyOf ?? []) as Record<string, unknown>[]) markVisibility(branch);
  return node;
}

/** The JSON Schema of each named schema, as OpenAPI components that refer to one another by name. */
function componentsFor(entries: { name: string; schema: z.ZodType }[], io: "input" | "output") {
  const registry = z.registry<{ id: string }>();
  for (const { name, schema } of entries) registry.add(schema, { id: name });
  const { schemas } = z.toJSONSchema(registry, {
    target: "draft-2020-12",
    io,
    uri: (id) => `#/components/schemas/${id}`,
  }) as { schemas: Record<string, Record<string, unknown>> };
  return Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => {
      const component = asComponent(schema);
      return [name, io === "output" ? markVisibility(component) : component];
    }),
  );
}

function pathParameterSchema(name: string): Record<string, unknown> {
  const schema = PATH_PARAMETERS[name];
  if (schema === undefined) throw new Error(`no check is declared for the path parameter {${name}}`);
  return asComponent(z.toJSONSchema(schema, { target: "draft-2020-12" }));
}

function pathParameters(path: string) {
  return [...path.matchAll(/\{([a-z]+)\}/g)].map(([, name]) => {
    const schema = pathParameterSchema(name!);
    return { name: name!, in: "path", required: true, schema };
  });
}

function refusalResponses() {
  return Object.fromEntries(
    Object.entries(REFUSALS).map(([code, description]) => [
      code,
      { description, content: { "application/problem+json": { schema: refTo("Problem") } } },
    ]),
  );
}

function publishedOperation(operationId: string, operation: Operation): Record<string, unknown> {
  const parameters = pathParameters(operation.path);
  const { request, response, retiring } = operation;
  return {
    operationId,
    summary: operation.summary,
    ...(retiring === undefined ? {} : { deprecated: true, "x-retiring": retiring }),
    "x-limits": operation.limits,
    security: [{ partnerKey: [] }],
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(request
      ? { requestBody: { required: true, content: { "application/json": { schema: refTo(request.name) } } } }
      : {}),
    responses: {
      "200": { description: "Done.", content: { "application/json": { schema: refTo(response.name) } } },
      ...refusalResponses(),
    },
  };
}

const VERSIONING_POLICY =
  "A change that would break partners becomes a new version under a new path prefix, running alongside the old one. " +
  "A retiring operation is marked deprecated here, and its answers carry Deprecation and Sunset headers and a link to " +
  "its successor. It keeps every security fix until it is switched off.";

/** The conference API's published specification, built from the zod contract. */
export function buildOpenApi(): Record<string, unknown> {
  const operations: [string, Operation][] = Object.entries(OPERATIONS);
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [operationId, operation] of operations) {
    (paths[operation.path] ??= {})[operation.method.toLowerCase()] = publishedOperation(operationId, operation);
  }
  const requests = operations.flatMap(([, operation]) => (operation.request ? [operation.request] : []));
  const responses = [...operations.map(([, operation]) => operation.response), { name: "Problem", schema: ProblemSchema }];
  return {
    openapi: "3.1.1",
    info: {
      title: "Conference API",
      version: "1.0.0",
      description: "Matching for conferences. Only partners' servers call it, each request with the API key for its conference.",
    },
    security: [{ partnerKey: [] }],
    "x-protections": PROTECTIONS,
    "x-versioning": { noticeMonths: NOTICE_MONTHS, policy: VERSIONING_POLICY },
    "x-business-limits": BUSINESS_LIMITS,
    paths,
    components: {
      schemas: { ...componentsFor(requests, "input"), ...componentsFor(responses, "output") },
      securitySchemes: {
        partnerKey: {
          type: "http",
          scheme: "bearer",
          description:
            "The API key for the conference in the path: cmapi_ then 43 characters, sent only in the Authorization header. " +
            "Each key reaches one conference, expires within a year, and can be cancelled at once.",
        },
      },
    },
  };
}

const OWNER = "conference API backend";

/** A body size in the unit it was set in: decimal megabytes (API Gateway's 10 MB), otherwise binary kibibytes. */
function sizeLabel(bytes: number): string {
  if (bytes % 1_000_000 === 0) return `${bytes / 1_000_000} MB`;
  if (bytes % KiB === 0) return `${bytes / KiB} KiB`;
  return `${bytes} B`;
}

function endpointRow(id: string, operation: Operation): string {
  const l = operation.limits;
  const body = operation.request ? `${sizeLabel(l.maxBodyBytes)} body, ` : "";
  const limitText = `${body}${l.requestsPerMinute}/min, ${l.requestsPerDay.toLocaleString("en-US")}/day, ${l.concurrentRequests} at once, ${l.timeoutSeconds} s`;
  const status = operation.retiring === undefined ? "live" : `retiring, off ${operation.retiring.sunset}`;
  return `| ${operation.method} | \`${operation.path}\` | ${id} | ${OWNER} | ${limitText} | ${status} |`;
}

/** The list of every endpoint, for our team: who owns it, its limits, and every connection into, within and out of
 *  the API. Generated from the contract. */
export function endpointList(): string {
  const rows = Object.entries(OPERATIONS as Record<string, Operation>).map(([id, operation]) => endpointRow(id, operation));
  return [
    "# Conference API endpoints",
    "",
    "Generated from the contract by `npm run emit --workspace=@repo/contracts`. Do not edit it by hand. For our team only: partners see the published specification.",
    "",
    "Every endpoint needs the API key for the conference in its path. Limits are per key, and the daily quota per partner and organiser. A test fails if the backend serves any route that is not listed here, or misses one that is.",
    "",
    "| Method | Path | Operation | Owner | Limits | Status |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
    "## Connections",
    "",
    "- **Into the API:** partners' servers call the endpoints above, each request with the API key for its conference.",
    "- **Between the API's own parts:** the backend calls the control database's `api.*` functions and each conference database's `api.*` functions. The matching worker calls each conference database's `api.*` functions. The data layer's migrations define every one of them.",
    "- **Out of the API:** the matching worker calls the AI model providers its engine is configured for. The backend calls nothing outside the API.",
    "",
  ].join("\n");
}
