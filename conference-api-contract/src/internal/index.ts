import { z } from "zod";

import {
  AttendeeKeysSchema,
  ErasePersonOutcomeSchema,
  PartnerKeyRecordSchema,
  RecordAttendanceCommandSchema,
  RecordAttendanceOutcomeSchema,
} from "./attendance";
import {
  ConferenceDatesSchema,
  ConferenceProfileSchema,
  CredentialRecordSchema,
  CredentialStatusSchema,
  PersonAttendanceSchema,
  WithdrawCredentialOutcomeSchema,
} from "./credentials";
import { AccessFactsSchema, AgreementListSchema, AgreementOutcomeSchema, CallerRecordSchema } from "./control";
import { ConferenceListSchema } from "./databases";
import {
  SearchMatchesOutcomeSchema,
  SearchMatchesQuerySchema,
  SetMatchSettingsCommandSchema,
  TextRequestCommandSchema,
  WriteTalksCommandSchema,
  WriteTalksOutcomeSchema,
} from "./data";
import {
  CompleteMatchingJobSchema,
  CorpusSchema,
  EngineTalkSchema,
  MatchingJobSchema,
  TextMatchJobSchema,
  TextMatchResultSchema,
} from "./engine";

export * from "./attendance";
export * from "./control";
export * from "./credentials";
export * from "./data";
export * from "./databases";
export * from "./engine";

/** Every shape the conference API's parts pass to each other, keyed by kind. */
export const INTERNAL_SCHEMAS = {
  caller_record: CallerRecordSchema,
  conference_list: ConferenceListSchema,
  access_facts: AccessFactsSchema,
  agreement_outcome: AgreementOutcomeSchema,
  agreement_list: AgreementListSchema,
  write_talks_command: WriteTalksCommandSchema,
  write_talks_outcome: WriteTalksOutcomeSchema,
  search_matches_query: SearchMatchesQuerySchema,
  search_matches_outcome: SearchMatchesOutcomeSchema,
  text_request_command: TextRequestCommandSchema,
  set_match_settings_command: SetMatchSettingsCommandSchema,
  record_attendance_command: RecordAttendanceCommandSchema,
  record_attendance_outcome: RecordAttendanceOutcomeSchema,
  attendee_keys: AttendeeKeysSchema,
  erase_person_outcome: ErasePersonOutcomeSchema,
  partner_key_record: PartnerKeyRecordSchema,
  person_attendance: PersonAttendanceSchema,
  credential_record: CredentialRecordSchema,
  withdraw_credential_outcome: WithdrawCredentialOutcomeSchema,
  credential_status: CredentialStatusSchema,
  conference_dates: ConferenceDatesSchema,
  conference_profile: ConferenceProfileSchema,
  engine_talk: EngineTalkSchema,
  corpus: CorpusSchema,
  matching_job: MatchingJobSchema,
  complete_matching_job: CompleteMatchingJobSchema,
  text_match_job: TextMatchJobSchema,
  text_match_result: TextMatchResultSchema,
} as const;
export type InternalKind = keyof typeof INTERNAL_SCHEMAS;

/** JSON Schema (draft 2020-12) for every internal kind, for the Python side. */
export function emitInternal(): Record<InternalKind, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(INTERNAL_SCHEMAS).map(([kind, schema]) => [
      kind,
      z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" }),
    ]),
  ) as unknown as Record<InternalKind, Record<string, unknown>>;
}
