// A change point shows the base, or the chosen version's change outlined in gold.
import "server-only";

import type { SessionDetail, SessionSummary, Track } from "@repo/host-contracts";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

import * as improvements from "@/improvements";
import { GoldOutline } from "@/versions/gold";
import { VERSION_COOKIE, versionFrom, type VersionId } from "@/versions/versions";

/** Every place in the base where a version may change the page, with what the base hands it. */
export interface ChangePoints {
  /** On a talk's page, after its abstract. */
  "talk.afterAbstract": { talkId: string };
  /** Conferences and Symposia's whole list. */
  "programmes.list": { tracks: Track[] };
  /** Above the Meeting Calendar's list of one day's sessions; the base shows nothing there. */
  "calendar.beforeDay": { date: string };
  /** The Meeting Calendar's list of one day's sessions, below the day's heading and the strip of days. */
  "calendar.day": { sessions: SessionSummary[] };
  /** On a session's page, its list of talks, under Presentations. */
  "session.talks": { session: SessionDetail };
}
type Point = keyof ChangePoints;

/** A version's change at one point: the point, its label in the English text, and what it shows there, given the
 *  label's words. */
export interface Change<P extends Point> {
  at: P;
  label: string;
  /** Set when the change edits only parts of what the base shows there and outlines each part itself, with the label;
   *  such a change draws an empty outline where it has nothing to show. */
  outlinesItself?: true;
  render: (props: ChangePoints[P], label: string) => React.ReactNode | Promise<React.ReactNode>;
}
export type Changes = { [P in Point]?: Change<P> };
type AnyChange = { [P in Point]: Change<P> }[Point];

/** A version's changes by the point each changes; two changes at one point are refused. */
export function changesFrom(list: AnyChange[]): Changes {
  const changes: Partial<Record<Point, AnyChange>> = {};
  for (const change of list) {
    if (changes[change.at]) throw new Error(`Two improvements change ${change.at}`);
    changes[change.at] = change;
  }
  return changes as Changes;
}

/** Each version's changes; the base changes nothing, and Our improvements' come from the list in their folder. */
const CHANGES: Record<VersionId, Changes> = { base: {}, improvements: changesFrom(Object.values(improvements)) };

/** The version this guest chose, read on the server so a page never shows the base first. */
export async function chosenVersion(): Promise<VersionId> {
  return versionFrom((await cookies()).get(VERSION_COOKIE)?.value);
}

/** What the base shows here, or the chosen version's change in a gold outline that says what was changed, drawn even
 *  when the change shows nothing; a change that outlines each of its parts itself shows as it is. */
export async function ChangePoint<P extends Point>({ at, props, children }: { at: P; props: ChangePoints[P]; children?: React.ReactNode }) {
  const change = CHANGES[await chosenVersion()][at] as Change<P> | undefined;
  if (!change) return <>{children}</>;
  const label = (await getTranslations("versions.change"))(change.label);
  const shown = await change.render(props, label);
  return change.outlinesItself ? <>{shown}</> : <GoldOutline label={label}>{shown}</GoldOutline>;
}
