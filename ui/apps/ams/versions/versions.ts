// The demo's versions are the base AMS meeting app and Our improvements, chosen on each guest's device.

/** Every version, in the order the switch goes through them; the first is the base, which changes nothing. */
export const VERSIONS = ["base", "improvements"] as const;
export type VersionId = (typeof VERSIONS)[number];

/** The cookie that keeps a guest's choice. */
export const VERSION_COOKIE = "demo-version";

/** The version a stored choice names; a missing or unknown one is the base. */
export function versionFrom(value: string | undefined): VersionId {
  return VERSIONS.find((v) => v === value) ?? "base";
}

/** The version the switch goes to next, from the last back to the base. */
export function nextVersion(current: VersionId): VersionId {
  return VERSIONS[(VERSIONS.indexOf(current) + 1) % VERSIONS.length]!;
}
