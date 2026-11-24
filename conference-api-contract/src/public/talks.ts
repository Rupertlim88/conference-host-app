import { z } from "zod";

import { JobIdSchema, PartnerIdSchema, ProgrammeVersionSchema } from "./ids";
import { text } from "./text";

/** ORCID's check character: ISO 7064 MOD 11-2 over the first 15 digits. */
function orcidCheckCharacter(first15: string): string {
  let total = 0;
  for (const digit of first15) total = (total + Number(digit)) * 2;
  const remainder = (12 - (total % 11)) % 11;
  return remainder === 10 ? "X" : String(remainder);
}

function hasValidCheckCharacter(orcid: string): boolean {
  const digits = orcid.replaceAll("-", "");
  return orcidCheckCharacter(digits.slice(0, 15)) === digits[15];
}

export const OrcidSchema = z
  .string()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)
  .refine(hasValidCheckCharacter, "has the wrong check digit");

export const AuthorSchema = z.strictObject({
  id: PartnerIdSchema,
  name: text(1, 300),
  orcid: OrcidSchema.optional(),
});
export type Author = z.infer<typeof AuthorSchema>;

export const SessionSchema = z.strictObject({
  id: PartnerIdSchema,
  title: text(1, 500).optional(),
  type: z.enum(["oral", "poster", "invited", "other"]).optional(),
});

/** Every value that appears again after its first appearance, in order. */
function repeats(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const value of values) {
    if (seen.has(value)) repeated.push(value);
    seen.add(value);
  }
  return repeated;
}

/** A refusal repeats an ID back only when it is a valid one, so nothing unchecked is echoed to the caller. */
const safeId = (id: string): string | null => (PartnerIdSchema.safeParse(id).success ? id : null);
const describeTalk = (id: string) => (safeId(id) ? `talk ${id}` : "a talk");

export const TalkInputSchema = z
  .strictObject({
    id: PartnerIdSchema,
    number: text(1, 64).optional(),
    title: text(1, 500),
    abstract: text(1, 10_000),
    type: z.enum(["oral", "poster", "invited", "keynote", "panel", "other"]).optional(),
    keywords: z.array(text(1, 100)).max(50).optional(),
    tracks: z.array(text(1, 100)).max(20).optional(),
    session: SessionSchema.optional(),
    start: z.iso.datetime({ offset: true }).optional(),
    end: z.iso.datetime({ offset: true }).optional(),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/).optional(),
    authors: z.array(AuthorSchema).max(200).optional(),
    presenters: z.array(PartnerIdSchema).max(200).optional(),
    status: z.enum(["scheduled", "withdrawn", "cancelled"]).optional(),
  })
  .superRefine((talk, ctx) => {
    const authorIds = (talk.authors ?? []).map((author) => author.id);
    const presenters = talk.presenters ?? [];
    if (repeats(authorIds).length > 0) {
      ctx.addIssue({ code: "custom", path: ["authors"], message: "lists the same author twice" });
    }
    if (repeats(presenters).length > 0) {
      ctx.addIssue({ code: "custom", path: ["presenters"], message: "lists the same presenter twice" });
    }
    for (const presenter of presenters) {
      if (!authorIds.includes(presenter)) {
        const who = safeId(presenter) ?? "a presenter";
        ctx.addIssue({ code: "custom", path: ["presenters"], message: `${who} is not in authors` });
      }
    }
    if (talk.start !== undefined && talk.end !== undefined && Date.parse(talk.end) <= Date.parse(talk.start)) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "must be after start" });
    }
  });
export type TalkInput = z.infer<typeof TalkInputSchema>;

export const TalksWriteRequestSchema = z
  .strictObject({
    talks: z.array(TalkInputSchema).min(1).max(1000),
    withdraw: z.array(PartnerIdSchema).max(1000).optional(),
    sync: z.string().regex(/^[A-Za-z0-9._:-]{1,100}$/).optional(),
    complete: z.boolean().optional(),
  })
  .superRefine((request, ctx) => {
    const sent = request.talks.map((talk) => talk.id);
    const withdrawn = request.withdraw ?? [];
    for (const id of new Set(repeats(sent))) {
      ctx.addIssue({ code: "custom", path: ["talks"], message: `${describeTalk(id)} is sent twice` });
    }
    for (const id of new Set(repeats(withdrawn))) {
      ctx.addIssue({ code: "custom", path: ["withdraw"], message: `${describeTalk(id)} is withdrawn twice` });
    }
    for (const id of withdrawn) {
      if (sent.includes(id)) {
        ctx.addIssue({ code: "custom", path: ["withdraw"], message: `${describeTalk(id)} is both sent and withdrawn` });
      }
    }
    if (request.complete !== undefined && request.sync === undefined) {
      ctx.addIssue({ code: "custom", path: ["complete"], message: "needs a sync name" });
    }
  })
  .meta({ dependentRequired: { complete: ["sync"] } });
export type TalksWriteRequest = z.infer<typeof TalksWriteRequestSchema>;

const CountSchema = z.int().min(0).max(1_000_000);

export const TalksWriteResponseSchema = z.strictObject({
  programmeVersion: ProgrammeVersionSchema,
  added: CountSchema,
  changed: CountSchema,
  withdrawn: CountSchema,
  unchanged: CountSchema,
  matchingJob: JobIdSchema.nullable(),
});
export type TalksWriteResponse = z.infer<typeof TalksWriteResponseSchema>;
