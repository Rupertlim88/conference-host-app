import type { SessionSummary } from "@repo/host-contracts";

import { PageTitle } from "@/components/page-title";
import { SessionList } from "@/components/session-list";

/** One session type's sessions, in Guidebook's list. */
export function TypeView({ kind, sessions }: { kind: string; sessions: SessionSummary[] }) {
  return (
    <>
      <PageTitle>{kind}</PageTitle>
      <SessionList sessions={sessions} />
    </>
  );
}
