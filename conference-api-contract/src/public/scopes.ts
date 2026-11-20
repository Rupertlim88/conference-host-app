import { z } from "zod";

/** The OAuth 2 scopes a token can carry: each names the actions it allows. */
export const ScopeSchema = z.enum([
  "talks:write",
  "matches:read",
  "settings:write",
  "attendance:write",
  "credentials:issue",
  "people:erase",
  "agreements:read",
  "agreements:write",
]);
export type Scope = z.infer<typeof ScopeSchema>;

/** The scopes an organiser can let an app provider use for it. Changing match settings, erasing people and
 *  managing agreements always stay with the organiser. */
export const ProviderScopeSchema = z.enum(["talks:write", "matches:read", "attendance:write", "credentials:issue"]);
export type ProviderScope = z.infer<typeof ProviderScopeSchema>;

/** Organisers built their own conference technology; app providers act for organisers through agreements. */
export const PartnerKindSchema = z.enum(["organiser", "provider"]);
export type PartnerKind = z.infer<typeof PartnerKindSchema>;
