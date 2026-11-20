import { z } from "zod";

import { operational } from "./labels";

import { ConferenceIdSchema, PartnerIdSchema } from "./ids";
import { ProviderScopeSchema } from "./scopes";
import { text } from "./text";

/** Our ID for an agreement: 128 random bits. */
export const AgreementIdSchema = z.string().regex(/^agr_[A-Za-z0-9_-]{22}$/);
export type AgreementId = z.infer<typeof AgreementIdSchema>;

const unique = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(item)
    .min(1)
    .max(max)
    .refine((items) => new Set(items).size === items.length, "lists the same value twice")
    .meta({ uniqueItems: true });

const terms = {
  /** The organiser's own conferences the provider may act on. */
  conferences: operational(unique(ConferenceIdSchema, 100)),
  /** What the provider may do on them. */
  scopes: operational(unique(ProviderScopeSchema, 4)),
  /** When the agreement ends: a date and time with its offset from UTC, at most 366 days away. */
  endsAt: operational(z.iso.datetime({ offset: true })),
};

/** An organiser lets an app provider act for it. */
export const CreateAgreementRequestSchema = z.strictObject({ provider: operational(PartnerIdSchema), ...terms });
export type CreateAgreementRequest = z.infer<typeof CreateAgreementRequestSchema>;

/** The organiser changes what an agreement covers and when it ends. */
export const ChangeAgreementRequestSchema = z.strictObject(terms);
export type ChangeAgreementRequest = z.infer<typeof ChangeAgreementRequestSchema>;

/** Withdrawing takes no terms. */
export const WithdrawAgreementRequestSchema = z.strictObject({});

const PartnerSchema = operational(z.strictObject({ id: operational(PartnerIdSchema), name: operational(text(1, 300)) }));
const InstantSchema = operational(z.iso.datetime());

/** An agreement as both its organiser and its provider see it. */
export const AgreementSchema = z.strictObject({
  id: operational(AgreementIdSchema),
  organiser: PartnerSchema,
  provider: PartnerSchema,
  conferences: operational(z.array(ConferenceIdSchema).min(1).max(100)),
  scopes: operational(z.array(ProviderScopeSchema).min(1).max(4)),
  endsAt: InstantSchema,
  /** "ended" once its end date passes; "withdrawn" once the organiser withdraws it. */
  status: operational(z.enum(["active", "ended", "withdrawn"])),
  createdAt: InstantSchema,
  changedAt: InstantSchema,
  /** Present only once withdrawn. */
  withdrawnAt: operational(InstantSchema.optional()),
});
export type Agreement = z.infer<typeof AgreementSchema>;

/** Every agreement the caller gave, as an organiser, or was given, as an app provider: oldest first. An
 *  organiser can make at most 1,000. */
export const ListAgreementsResponseSchema = z.strictObject({ agreements: operational(z.array(AgreementSchema).max(1000)) });
export type ListAgreementsResponse = z.infer<typeof ListAgreementsResponseSchema>;
