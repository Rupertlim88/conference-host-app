// Each conference's database is named from its checked ID, so no two can share a name.
import { z } from "zod";

import { ConferenceIdSchema } from "../public/ids";

/** Each conference has its own database, named from its checked ID. Conference IDs never hold underscores, so two
 *  IDs can never map to the same name. */
export function conferenceDatabaseName(conferenceId: string): string {
  const id = ConferenceIdSchema.parse(conferenceId);
  return `conf_${id.replaceAll("-", "_")}`;
}

/** The conferences the matching worker serves, as the control database lists them. */
export const ConferenceListSchema = z.strictObject({
  conferences: z.array(ConferenceIdSchema).max(10_000),
});
export type ConferenceList = z.infer<typeof ConferenceListSchema>;
