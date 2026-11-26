// A change point shows the base, or the chosen version's change outlined in gold.
import "server-only";

import type { SessionSummary, Track } from "@repo/host-contracts";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

import { changes as improvements } from "@/improvements/changes";
import { GoldOutline } from "@/versions/gold";
import { VERSION_COOKIE, versionFrom, type VersionId } from "@/versions/versions";

/** Every place in the base where a version may change the page, with what the base hands it. */
export interface ChangePoints {
  /** On a talk's page, after its abstract. */
  "talk.afterAbstract": { talkId: string };
  /** Conferences and Symposia's whole list. */
  "programmes.list": { tracks: Track[] };
  /** The Meeting Calendar's list of one day's sessions, below the day's heading and the strip of days. */
  "calendar.day": { sessions: SessionSummary[] };
}
type Point = keyof ChangePoints;

/** A version's change at one point: its label in the English text, and what it shows there, given the label's words. */
export interface Change<P extends Point> {
  label: string;
  /** Set when the change edits several parts of the page and outlines each part itself, with the label. */
  outlinesItself?: true;
  render: (props: ChangePoints[P], label: string) => React.ReactNode | Promise<React.ReactNode>;
}
export type Changes = { [P in Point]?: Change<P> };

/** Each version's changes; the base changes nothing. */
const CHANGES: Record<VersionId, Changes> = { base: {}, improvements };

/** The version this guest chose, read on the server so a page never shows the base first. */
export async function chosenVersion(): Promise<VersionId> {
  return versionFrom((await cookies()).get(VERSION_COOKIE)?.value);
}

/** What the base shows here, or the chosen version's change in a gold outline that says what was changed; a change
 *  that outlines each of its parts itself shows as it is. */
export async function ChangePoint<P extends Point>({ at, props, children }: { at: P; props: ChangePoints[P]; children?: React.ReactNode }) {
  const change = CHANGES[await chosenVersion()][at] as Change<P> | undefined;
  if (!change) return <>{children}</>;
  const label = (await getTranslations("versions.change"))(change.label);
  const shown = await change.render(props, label);
  return change.outlinesItself ? <>{shown}</> : <GoldOutline label={label}>{shown}</GoldOutline>;
}
