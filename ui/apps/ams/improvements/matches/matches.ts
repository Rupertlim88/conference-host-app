// The improvements matched around the attendee's own abstract share one answer from the matching API on each page.
import "server-only";

import type { AroundScope, SessionSummary } from "@repo/host-contracts";
import { cache } from "react";

import { serverApi } from "@/shared/server";

/** The backend's view around the fixed abstract for one page's scope, written as a string, so that React remembers one
 *  answer for each page's request however many improvements ask with the same scope. */
const aroundFor = cache(async (scope: string) => (await serverApi()).improvements.aroundAbstract(JSON.parse(scope) as AroundScope));

/** The backend's view around the fixed abstract for what one page shows, asked once for each page's request. */
export function aroundAbstract(scope: AroundScope) {
  return aroundFor(JSON.stringify(scope));
}

/** What a day of the Meeting Calendar shows: the day, and the start of each of its time blocks, each once. Both of the
 *  calendar's improvements name the day this way, so they share one answer. */
export function calendarScope(date: string, sessions: SessionSummary[]): AroundScope {
  const starts = [...new Set(sessions.flatMap((s) => (s.startsAt ? [s.startsAt] : [])))];
  return starts.length ? { day: [date], timeBlock: starts } : { day: [date] };
}
