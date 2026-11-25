// Only one send runs at a time, and a run that never finished is taken over after ten minutes.
import { randomUUID } from "node:crypto";
import type { SyncRun, SyncRunState } from "@repo/host-contracts";
import { and, desc, eq, sql } from "drizzle-orm";

import type { Db } from "./connect";
import { SOCIETY_TABLES, type Society, type SocietyTables } from "./tables";

// The rule "two sends never run at once" is model-checked: .claude/skills/verify-send-runs. Change start, finish
// or fail, or this number, only with that check.
/** A run still running this long after it started is taken to have died, and the next start marks it interrupted.
 *  It must be longer than a send can last (SEND_DEADLINE_MS in backend/src/send.ts). */
export const STALE_AFTER_MINUTES = 10;

export interface SyncCounts {
  sent: number;
  added: number;
  changed: number;
  withdrawn: number;
  unchanged: number;
  programmeVersion: string;
}

type Row = SocietyTables["syncRuns"]["$inferSelect"];
const toSyncRun = (r: Row): SyncRun => ({
  id: r.id,
  state: r.state as SyncRunState,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
  sent: r.sent,
  added: r.added,
  changed: r.changed,
  withdrawn: r.withdrawn,
  unchanged: r.unchanged,
  programmeVersion: r.programmeVersion,
  error: r.error,
});

/** One society's log of programme sends, which also allows only one send at a time. */
export function createSyncLog(db: Db, society: Society) {
  const t = SOCIETY_TABLES[society].syncRuns;

  async function run(id: number): Promise<SyncRun> {
    const [row] = await db.select().from(t).where(eq(t.id, id));
    if (!row) throw new Error(`no send run ${id}`);
    return toSyncRun(row);
  }

  /** Ends a run that is still running. A run already ended, for example marked interrupted, stays as it is. */
  async function end(id: number, values: Partial<Row>): Promise<SyncRun> {
    await db
      .update(t)
      .set({ ...values, finishedAt: sql`now()` })
      .where(and(eq(t.id, id), eq(t.state, "running")));
    return run(id);
  }

  return {
    /**
     * Starts a run with a fresh sync name, or returns null while another run is running. First marks runs older
     * than STALE_AFTER_MINUTES interrupted. The partial unique index sync_runs_one_running decides between
     * starts that race.
     */
    async start(): Promise<{ id: number; syncName: string } | null> {
      return db.transaction(async (tx) => {
        await tx
          .update(t)
          .set({ state: "interrupted", finishedAt: sql`now()`, error: `No result after ${STALE_AFTER_MINUTES} minutes` })
          .where(and(eq(t.state, "running"), sql`${t.startedAt} < now() - make_interval(mins => ${STALE_AFTER_MINUTES})`));
        const [row] = await tx
          .insert(t)
          .values({ syncName: `send-${randomUUID()}`, state: "running" })
          .onConflictDoNothing()
          .returning({ id: t.id, syncName: t.syncName });
        return row ?? null;
      });
    },

    finish: (id: number, counts: SyncCounts) => end(id, { state: "sent", ...counts }),

    fail: (id: number, error: string) => end(id, { state: "failed", error: error.slice(0, 500) }),

    /** The last ten runs, newest first. */
    async runs(): Promise<SyncRun[]> {
      const rows = await db.select().from(t).orderBy(desc(t.id)).limit(10);
      return rows.map(toSyncRun);
    },
  };
}

export type SyncLog = ReturnType<typeof createSyncLog>;
