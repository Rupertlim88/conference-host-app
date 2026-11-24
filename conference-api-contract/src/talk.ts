import { z } from "zod";

const optionalText = z.string().nullable();
const optionalMoment = z.iso.datetime().nullable();

/** One talk, as loaded from the APS feed. ID 0 is kept for an external anchor. */
export const TalkSchema = z
  .strictObject({
    id: z.int().min(0),
    external_id: optionalText,
    title: z.string().min(1),
    abstract: z.string(),
    units: z.array(z.string()),
    topics: z.array(z.string()),
    type: optionalText,
    is_invited: z.boolean(),
    is_withdrawn: z.boolean(),
    start: optionalMoment,
    end: optionalMoment,
    sort_order: z.int().nullable(),
    presentation_location: optionalText,
    author_ids: z.array(z.int()),
    presenter_ids: z.array(z.int()),
    publication_reference: optionalText,
    funding_acknowledgement: optionalText,
    team_acknowledgement: optionalText,
    session_id: z.int().nullable(),
    session_title: optionalText,
    session_code: optionalText,
    session_type: optionalText,
    session_topics: z.array(z.string()),
    building: optionalText,
    room: optionalText,
  })
  .meta({ id: "Talk", title: "Talk" });

export type Talk = z.infer<typeof TalkSchema>;
