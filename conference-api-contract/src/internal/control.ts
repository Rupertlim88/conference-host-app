import { z } from "zod";

import { ConferenceIdSchema, PartnerIdSchema } from "../public/ids";

/** A partner's API key: a fixed prefix, so a leaked key is easy to spot, then 32 random bytes in base64url. Only its
 *  SHA-256 is ever stored. */
export const ApiKeySchema = z.string().regex(/^cmapi_[A-Za-z0-9_-]{43}$/);

/** An API key's public ID: a prefix, then 128 random bits. Logs and our team name a key by this, never by the key. */
export const KeyIdSchema = z.string().regex(/^key_[A-Za-z0-9_-]{22}$/);

/** A live key, as the control database finds it by its hash: its ID, the partner it was issued to, the one
 *  conference it reaches, and that conference's organiser, for whom every action is recorded. */
export const KeyHolderSchema = z.strictObject({
  keyId: KeyIdSchema,
  partner: PartnerIdSchema,
  conference: ConferenceIdSchema,
  organiser: PartnerIdSchema,
});
export type KeyHolder = z.infer<typeof KeyHolderSchema>;
