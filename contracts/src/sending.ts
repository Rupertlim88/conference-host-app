// A send and the developer console's checks have fixed forms.
import { z } from "zod";

import { ChangesSchema, Total } from "./organiser";
import { Id, Instant } from "./programme";

export const SyncRunStateSchema = z.enum(["running", "sent", "failed", "interrupted"]);
export type SyncRunState = z.infer<typeof SyncRunStateSchema>;

export const SyncRunSchema = z.strictObject({
  id: z.int().min(1),
  state: SyncRunStateSchema,
  startedAt: z.iso.datetime(),
  finishedAt: Instant,
  sent: Total,
  added: Total,
  changed: Total,
  withdrawn: Total,
  unchanged: Total,
  programmeVersion: z.string(),
  /** Why a failed run failed: the API's status and problem title, never its body or the key. Empty otherwise. */
  error: z.string(),
});
export type SyncRun = z.infer<typeof SyncRunSchema>;

// ---- Developer console ----

export const ConnectionStatusSchema = z.enum([
  "ok",
  "not-set",
  "refused-key",
  "no-programme",
  "unreachable",
  "unexpected-answer",
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const ConnectionTestSchema = z.strictObject({
  status: ConnectionStatusSchema,
  httpStatus: z.int().min(100).max(599).nullable(),
  ms: z.int().min(0).nullable(),
});
export type ConnectionTest = z.infer<typeof ConnectionTestSchema>;

export const ApiStatusSchema = z.strictObject({
  /** The API's address without credentials, query or fragment. */
  apiAddress: z.string().nullable(),
  keySet: z.boolean(),
  lastRun: SyncRunSchema.nullable(),
  changes: ChangesSchema,
});
export type ApiStatus = z.infer<typeof ApiStatusSchema>;

/** The talk the developer console fixes the demo to. */
export const FixedAbstractInputSchema = z.strictObject({ talkId: Id });
