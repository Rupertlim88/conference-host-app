import type { z } from "zod";

/** The kinds of data the API holds, and the protection each gets, set with data protection law in mind. Every
 *  field in the specification is labelled with one; a field that holds others is labelled with the most
 *  sensitive kind it holds. The API holds no health or payment data. */
export const DATA_KINDS = {
  pii: {
    protection: "high",
    description:
      "About an identifiable person: their IDs, names, ORCID iDs, attendance and credentials. Sealed field by field where stored, " +
      "never logged in full, never cached, and sent only to services approved for it.",
  },
  programme: {
    protection: "moderate",
    description: "A conference's programme and what is worked out from it: talks, sessions, their content and match reasons.",
  },
  operational: {
    protection: "standard",
    description: "How the API works: the IDs it makes, counts, scores, settings, times, agreement terms and refusals.",
  },
} as const;
export type DataKind = keyof typeof DATA_KINDS;

const labelled =
  (kind: DataKind) =>
  <T extends z.ZodType>(schema: T): T =>
    schema.meta({ "x-data-kind": kind });

/** A field about an identifiable person. */
export const pii = labelled("pii");
/** A field of a conference's programme, or worked out from it. */
export const programme = labelled("programme");
/** A field about how the API works. */
export const operational = labelled("operational");
