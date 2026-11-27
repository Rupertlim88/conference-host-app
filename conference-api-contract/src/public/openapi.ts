// Every request states what to expect.
import { z } from "zod";

import { ConferenceIdSchema } from "./ids";
import {
  MatchesFromTextRequestSchema,
  MatchesFromTextResponseSchema,
  MatchesSearchRequestSchema,
  MatchesSearchResponseSchema,
} from "./matches";
import { ProblemSchema } from "./problem";
import { TalksWriteRequestSchema, TalksWriteResponseSchema } from "./talks";

export interface OperationLimits {
  /** The largest request body accepted, in bytes. */
  maxBodyBytes: number;
  /** Requests one key may make per minute, counted over one-minute windows. */
  requestsPerMinute: number;
  /** The API answers, or gives up, within this time. */
  timeoutSeconds: number;
}

interface Operation {
  method: "POST";
  path: string;
  summary: string;
  limits: OperationLimits;
  request: { name: string; schema: z.ZodType };
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

/** Every name that may appear in braces in a path, and the check its value must pass. */
export const PATH_PARAMETERS: Record<string, z.ZodType> = {
  conference: ConferenceIdSchema,
};

/** The ceilings every operation's own limits fit inside, so the limits partners read are the ones that hold: no request
 *  body over 10 MB, and no answer after 29 seconds, when the front door's load balancer stops waiting (its idle timeout
 *  is set from here). */
export const FRONT_DOOR = { maxBodyBytes: 10_000_000, timeoutSeconds: 29 } as const;

/** What every request meets at the front door's firewall, before anything else. */
export const PROTECTIONS = {
  /** Requests one network address may make in five minutes. Past that, the firewall refuses the address's requests. */
  requestsPerFiveMinutesPerAddress: 3_000,
} as const;

/** How much one conference may hold, counting everything kept, and how many talks it may add or change in a day.
 *  Reaching a limit refuses new data and never deletes any. The data layer enforces exactly these. */
export const BUSINESS_LIMITS = {
  talksPerConference: 50_000,
  /** Every past state of every talk is kept; each accepted change adds one. */
  keptTalkRevisionsPerConference: 2_000_000,
  /** Every accepted talks:write adds one. */
  programmeVersionsPerConference: 200_000,
  /** Counted per UTC day. Each talk a talks:write adds, changes or withdraws counts once; a talk sent again
   *  unchanged does not count. */
  newOrChangedTalksPerConferencePerDay: 5_000,
} as const;

const KiB = 1024;

function limits(maxBodyBytes: number, requestsPerMinute: number, timeoutSeconds: number): OperationLimits {
  return { maxBodyBytes, requestsPerMinute, timeoutSeconds };
}

/** The one source of every operation's path and limits. The backend enforces these. */
export const OPERATIONS = {
  writeTalks: {
    method: "POST",
    path: "/v1/conferences/{conference}/talks:write",
    summary: "Send one talk, several, or the whole programme. All or nothing.",
    limits: limits(10_000_000, 60, 25),
    request: { name: "TalksWriteRequest", schema: TalksWriteRequestSchema },
    response: { name: "TalksWriteResponse", schema: TalksWriteResponseSchema },
  },
  searchMatches: {
    method: "POST",
    path: "/v1/conferences/{conference}/matches:search",
    summary: "Get matches already worked out, by people or by liked talks.",
    limits: limits(64 * KiB, 600, 10),
    request: { name: "MatchesSearchRequest", schema: MatchesSearchRequestSchema },
    response: { name: "MatchesSearchResponse", schema: MatchesSearchResponseSchema },
  },
  matchesFromText: {
    method: "POST",
    path: "/v1/conferences/{conference}/matches:fromText",
    summary:
      "Get matches for text a person enters. It is matched like a new talk, which can take minutes: until it is judged, " +
      "the answer is {\"judging\": true}; ask again with the same request, every 30 seconds or more, and once judged it " +
      "is answered at once, as of the same programme version.",
    limits: limits(64 * KiB, 60, 20),
    request: { name: "MatchesFromTextRequest", schema: MatchesFromTextRequestSchema },
    response: { name: "MatchesFromTextResponse", schema: MatchesFromTextResponseSchema },
  },
} as const satisfies Record<string, Operation>;

/** What each refusal means, as the specification documents it. */
const REFUSALS: Record<string, string> = {
  "400": "The request breaks the specification; nothing was applied. Do not retry unchanged.",
  "401": "No valid API key: the Authorization header must carry this conference's live key, as Bearer <key>.",
  "403": "The front door's firewall refused the request: it comes from a blocked network address, or carries a known attack. Do not retry unchanged.",
  "404": "No such conference for this key. Asking for any conference but the key's own gets this same answer.",
  "409": "The conference holds as much as it may: nothing was applied. The business limits are in x-business-limits.",
  "413": "The request body is larger than this request allows.",
  "415": "The body is not JSON in UTF-8, uncompressed.",
  "429":
    "Too many requests per minute with this key, or from this network address at the front door's firewall. " +
    "Or a talks:write would pass the day's limit on new or changed talks for its conference, in x-business-limits; nothing was applied. " +
    "Retry after the time in Retry-After.",
  "500": "An unexpected error. Safe to retry: sending the same request again gives the same result.",
  "503": "The API cannot answer in time just now, or is too busy. Safe to retry after the time in Retry-After.",
};

const refTo = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** A JSON Schema turned into an OpenAPI component: the document-level keywords dropped. */
function asComponent(schema: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$schema" && key !== "$id"));
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
  return Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, asComponent(schema)]));
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
    requestBody: { required: true, content: { "application/json": { schema: refTo(request.name) } } },
    responses: {
      "200": { description: "Done.", content: { "application/json": { schema: refTo(response.name) } } },
      ...refusalResponses(),
    },
  };
}

const VERSIONING_POLICY =
  "A change that would break partners becomes a new version under a new path prefix, running alongside the old one. " +
  "A retiring operation is marked deprecated here, with when it was announced, when it is switched off and its " +
  "successor, and partners are told directly. It is switched off only after the notice agreed with partners, and " +
  "keeps every security fix until then.";

/** The conference API's published specification, built from the zod contract. */
export function buildOpenApi(): Record<string, unknown> {
  const operations: [string, Operation][] = Object.entries(OPERATIONS);
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [operationId, operation] of operations) {
    (paths[operation.path] ??= {})[operation.method.toLowerCase()] = publishedOperation(operationId, operation);
  }
  const requests = operations.map(([, operation]) => operation.request);
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
    "x-versioning": { policy: VERSIONING_POLICY },
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

/** A body size in the unit it was set in: decimal megabytes (the 10 MB ceiling), otherwise binary kibibytes. */
function sizeLabel(bytes: number): string {
  if (bytes % 1_000_000 === 0) return `${bytes / 1_000_000} MB`;
  if (bytes % KiB === 0) return `${bytes / KiB} KiB`;
  return `${bytes} B`;
}

function endpointRow(id: string, operation: Operation): string {
  const l = operation.limits;
  const limitText = `${sizeLabel(l.maxBodyBytes)} body, ${l.requestsPerMinute}/min, ${l.timeoutSeconds} s`;
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
    "Every endpoint needs the API key for the conference in its path. Limits are per key. A test fails if the backend serves any route that is not listed here, or misses one that is.",
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
