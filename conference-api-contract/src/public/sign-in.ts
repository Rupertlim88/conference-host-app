import { z } from "zod";

import { operational } from "./labels";
import { ScopeSchema } from "./scopes";

const SCOPE = `(${ScopeSchema.options.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`;

/** A partner's system signs in with OAuth 2 client credentials (backend rule 12), proving who it is with a statement it
 *  signed with one of its own keys (private_key_jwt, RFC 7523), never with a password or a shared secret. */
export const TokenRequestSchema = z.strictObject({
  grant_type: operational(z.literal("client_credentials")),
  client_assertion_type: operational(z.literal("urn:ietf:params:oauth:client-assertion-type:jwt-bearer")),
  /** A JWT the partner signed with one of its registered keys: issued by and about the partner's client ID, for our
   *  token endpoint, with a unique ID and a short life. */
  client_assertion: operational(
    z
      .string()
      .max(8_192)
      .regex(/^[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}$/),
  ),
  /** The scopes wanted, separated by spaces; the partner gets at most the ones it was granted. */
  scope: operational(z.string().max(512).regex(new RegExp(`^${SCOPE}( ${SCOPE})*$`)).optional()),
});
export type TokenRequest = z.infer<typeof TokenRequestSchema>;

/** The token a partner then sends with every request. It is opaque: a random string that reveals nothing; inside the
 *  API it stands for the signed token the sign-in service issued (backend rule 14). */
export const TokenResponseSchema = z.strictObject({
  access_token: operational(z.string().regex(/^[A-Za-z0-9_-]{43}$/)),
  token_type: operational(z.literal("Bearer")),
  /** Seconds until the token expires. */
  expires_in: operational(z.number().int().min(1).max(3_600)),
  /** The scopes the token carries, separated by spaces. */
  scope: operational(z.string().max(512)),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/** A partner revokes one of its own opaque tokens, at once, by sending it (RFC 7009). Holding the token is enough to
 *  revoke it, since revoking only ever takes access away. */
export const RevokeRequestSchema = z.strictObject({
  token: operational(z.string().regex(/^[A-Za-z0-9_-]{43}$/)),
  /** Optional; the API's partners hold only access tokens. */
  token_type_hint: operational(z.literal("access_token").optional()),
});
export type RevokeRequest = z.infer<typeof RevokeRequestSchema>;

/** Always empty: whether the token was known, live or already revoked is never said (RFC 7009 section 2.2). */
export const RevokeResponseSchema = z.strictObject({});
