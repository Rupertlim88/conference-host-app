// A change point shows the base, or the chosen version's change outlined in gold.
import "server-only";

import type { Track } from "@repo/host-contracts";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

import { changes as improvements } from "@/improvements/changes";
import { VERSION_COOKIE, versionFrom, type VersionId } from "@/versions/versions";

/** Every place in the base where a version may change the page, with what the base hands it. */
export interface ChangePoints {
  /** On a talk's page, after its abstract. */
  "talk.afterAbstract": { talkId: string };
  /** Conferences and Symposia's whole list. */
  "programmes.list": { tracks: Track[] };
}
type Point = keyof ChangePoints;

/** A version's change at one point: its label in the English text, and what it shows there. */
export interface Change<P extends Point> {
  label: string;
  render: (props: ChangePoints[P]) => React.ReactNode | Promise<React.ReactNode>;
}
export type Changes = { [P in Point]?: Change<P> };

/** Each version's changes; the base changes nothing. */
const CHANGES: Record<VersionId, Changes> = { base: {}, improvements };

/** The version this guest chose, read on the server so a page never shows the base first. */
export async function chosenVersion(): Promise<VersionId> {
  return versionFrom((await cookies()).get(VERSION_COOKIE)?.value);
}

/** What the base shows here, or the chosen version's change in a gold outline that says what was changed. */
export async function ChangePoint<P extends Point>({ at, props, children }: { at: P; props: ChangePoints[P]; children?: React.ReactNode }) {
  const change = CHANGES[await chosenVersion()][at] as Change<P> | undefined;
  if (!change) return <>{children}</>;
  const t = await getTranslations("versions.change");
  return (
    <section className="relative mt-4 mb-5 rounded-md border-2 border-amber-400 px-3 pt-5 pb-3">
      <span className="absolute -top-3 left-3 rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">{t(change.label)}</span>
      {await change.render(props)}
    </section>
  );
}
