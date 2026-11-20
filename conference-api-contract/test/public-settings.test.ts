import { describe, expect, test } from "vitest";

import { INTERNAL_SCHEMAS } from "../src/internal/index";
import { MatchSettingsSchema, OPERATIONS } from "../src/public/index";

describe("the organiser's match settings", () => {
  test("the organiser chooses the kinds of match and, if it likes, how many per person", () => {
    expect(MatchSettingsSchema.safeParse({ kinds: ["core", "unexpected"] }).success).toBe(true);
    expect(MatchSettingsSchema.safeParse({ kinds: ["unexpected"], maxPerPerson: 1 }).success).toBe(true);
    expect(MatchSettingsSchema.safeParse({ kinds: ["core"], maxPerPerson: 1000 }).success).toBe(true);
  });

  test("settings that cannot be meant are refused", () => {
    for (const bad of [
      { kinds: [] },
      { kinds: ["core", "core"] },
      { kinds: ["best"] },
      { kinds: ["core"], maxPerPerson: 0 },
      { kinds: ["core"], maxPerPerson: 1001 },
      { kinds: ["core"], maxPerPerson: 2.5 },
      { kinds: ["core"], extra: 1 },
    ]) {
      expect(MatchSettingsSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  test("anyone who reads matches can read them; only the organiser changes them", () => {
    expect(OPERATIONS.getMatchSettings).toMatchObject({
      method: "GET",
      path: "/v1/conferences/{conference}/matchSettings",
      permission: "matches:read",
      partnerKinds: ["organiser", "provider"],
    });
    expect(OPERATIONS.setMatchSettings).toMatchObject({
      method: "PUT",
      path: "/v1/conferences/{conference}/matchSettings",
      permission: "settings:write",
      partnerKinds: ["organiser"],
    });
  });

  test("a change names whom it acts for", () => {
    const command = { actor: { partner: "org-aps", organiser: "org-aps" }, settings: { kinds: ["core"] } };
    expect(INTERNAL_SCHEMAS.set_match_settings_command.safeParse(command).success).toBe(true);
    expect(INTERNAL_SCHEMAS.set_match_settings_command.safeParse({ settings: command.settings }).success).toBe(false);
  });
});
