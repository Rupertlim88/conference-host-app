import { z } from "zod";

import { operational, pii, programme } from "./labels";

import { JobIdSchema, PartnerIdSchema, ProgrammeVersionSchema } from "./ids";
import { text } from "./text";

const OffsetDateTimeSchema = z.iso.datetime({ offset: true });

/** ORCID's ISO 7064 MOD 11-2 check digit over the first 15 digits. */
function orcidCheckDigit(digits: string): string {
  let total = 0;
  for (const c of digits) total = (total + Number(c)) * 2;
  const result = (12 - (total % 11)) % 11;
  return result === 10 ? "X" : String(result);
}

export const OrcidSchema = z
  .string()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)
  .refine((id) => {
    const plain = id.replaceAll("-", "");
    return orcidCheckDigit(plain.slice(0, 15)) === plain[15];
  }, "has the wrong check digit")
  .meta({ "x-data-kind": "pii" });

export const AuthorSchema = z.strictObject({
  id: pii(PartnerIdSchema),
  name: pii(text(1, 300)),
  orcid: pii(OrcidSchema.optional()),
});
export type Author = z.infer<typeof AuthorSchema>;

export const SessionSchema = z.strictObject({
  id: programme(PartnerIdSchema),
  title: programme(text(1, 500).optional()),
  type: programme(z.enum(["oral", "poster", "invited", "other"]).optional()),
});

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((v) => (seen.has(v) ? true : (seen.add(v), false)));
}

/** A refusal names an id only when it is a valid one, so nothing a caller sent is repeated back unchecked. */
const nameOf = (id: string) => (PartnerIdSchema.safeParse(id).success ? id : null);
const talkOf = (id: string) => (nameOf(id) ? `talk ${id}` : "a talk");

export const TalkInputSchema = z
  .strictObject({
    id: programme(PartnerIdSchema),
    number: programme(text(1, 64).optional()),
    title: programme(text(1, 500)),
    abstract: programme(text(1, 10_000)),
    type: programme(z.enum(["oral", "poster", "invited", "keynote", "panel", "other"]).optional()),
    keywords: programme(z.array(text(1, 100)).max(50).optional()),
    tracks: programme(z.array(text(1, 100)).max(20).optional()),
    session: programme(SessionSchema.optional()),
    start: programme(OffsetDateTimeSchema.optional()),
    end: programme(OffsetDateTimeSchema.optional()),
    language: programme(z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/).optional()),
    authors: pii(z.array(AuthorSchema).max(200).optional()),
    presenters: pii(z.array(PartnerIdSchema).max(200).optional()),
    status: programme(z.enum(["scheduled", "withdrawn", "cancelled"]).optional()),
  })
  .superRefine((talk, ctx) => {
    const authorIds = (talk.authors ?? []).map((a) => a.id);
    if (duplicates(authorIds).length > 0) {
      ctx.addIssue({ code: "custom", path: ["authors"], message: "lists the same author twice" });
    }
    const presenters = talk.presenters ?? [];
    if (duplicates(presenters).length > 0) {
      ctx.addIssue({ code: "custom", path: ["presenters"], message: "lists the same presenter twice" });
    }
    for (const p of presenters) {
      if (!authorIds.includes(p)) {
        ctx.addIssue({ code: "custom", path: ["presenters"], message: `${nameOf(p) ?? "a presenter"} is not in authors` });
      }
    }
    if (talk.start !== undefined && talk.end !== undefined && Date.parse(talk.end) <= Date.parse(talk.start)) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "must be after start" });
    }
  });
export type TalkInput = z.infer<typeof TalkInputSchema>;

export const TalksWriteRequestSchema = z
  .strictObject({
    talks: pii(z.array(TalkInputSchema).min(1).max(1000)),
    withdraw: programme(z.array(PartnerIdSchema).max(1000).optional()),
    sync: operational(z.string().regex(/^[A-Za-z0-9._:-]{1,100}$/).optional()),
    complete: operational(z.boolean().optional()),
  })
  .superRefine((req, ctx) => {
    const ids = req.talks.map((t) => t.id);
    for (const id of new Set(duplicates(ids))) {
      ctx.addIssue({ code: "custom", path: ["talks"], message: `${talkOf(id)} is sent twice` });
    }
    const withdraw = req.withdraw ?? [];
    for (const id of new Set(duplicates(withdraw))) {
      ctx.addIssue({ code: "custom", path: ["withdraw"], message: `${talkOf(id)} is withdrawn twice` });
    }
    for (const id of withdraw) {
      if (ids.includes(id)) {
        ctx.addIssue({ code: "custom", path: ["withdraw"], message: `${talkOf(id)} is both sent and withdrawn` });
      }
    }
    if (req.complete !== undefined && req.sync === undefined) {
      ctx.addIssue({ code: "custom", path: ["complete"], message: "needs a sync name" });
    }
  })
  .meta({ dependentRequired: { complete: ["sync"] } });
export type TalksWriteRequest = z.infer<typeof TalksWriteRequestSchema>;

const CountSchema = operational(z.int().min(0).max(1_000_000));

export const TalksWriteResponseSchema = z.strictObject({
  programmeVersion: operational(ProgrammeVersionSchema),
  added: CountSchema,
  changed: CountSchema,
  withdrawn: CountSchema,
  unchanged: CountSchema,
  matchingJob: operational(JobIdSchema.nullable()),
});
export type TalksWriteResponse = z.infer<typeof TalksWriteResponseSchema>;
