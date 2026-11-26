// The demo is fixed to one abstract, which the developer console sets.
import type { TalkSummary } from "@repo/host-contracts";
import { and, asc, eq, ne } from "drizzle-orm";

import type { Db } from "./connect";
import { toTalkSummary } from "./programme";
import { SOCIETY_TABLES, type Society } from "./tables";

/** The demo's default abstract: Core Science Keynote 10.1, on satellite constraints on fire combustion and smoke
 *  injection. Its presenter is highly cited, and its topic reaches 42 of the meeting's 44 programmes with abstracts, so
 *  its matches cross many fields. Keynotes are always in the demo's sample. */
export const DEFAULT_ABSTRACT = "498388";

export function createDemoSettings(db: Db, society: Society, defaultTalkId: string = DEFAULT_ABSTRACT) {
  const t = SOCIETY_TABLES[society];
  /** A talk the demo can be fixed to: shown, not a break, and with an abstract. */
  const fixable = and(eq(t.talks.withdrawn, false), ne(t.talks.kind, "break"), ne(t.talks.abstract, ""));

  async function talkIfFixable(id: string): Promise<TalkSummary | null> {
    const [row] = await db.select().from(t.talks).where(and(fixable, eq(t.talks.id, id)));
    return row ? toTalkSummary(row) : null;
  }

  return {
    /** The abstract the developer console set, while it is still fixable; otherwise the default abstract, while it is
     *  fixable; otherwise the earliest fixable talk. */
    async fixedAbstract(): Promise<TalkSummary | null> {
      const [setting] = await db.select().from(t.demoSettings);
      const chosen = (setting?.fixedTalkId ? await talkIfFixable(setting.fixedTalkId) : null) ?? (await talkIfFixable(defaultTalkId));
      if (chosen) return chosen;
      const [first] = await db.select().from(t.talks).where(fixable).orderBy(asc(t.talks.startsAt), asc(t.talks.sort), asc(t.talks.id)).limit(1);
      return first ? toTalkSummary(first) : null;
    },

    /** Fixes the demo to a fixable talk and returns it; any other talk is refused with null, leaving the setting. */
    async setFixedAbstract(talkId: string): Promise<TalkSummary | null> {
      const talk = await talkIfFixable(talkId);
      if (!talk) return null;
      await db
        .insert(t.demoSettings)
        .values({ id: 1, fixedTalkId: talkId })
        .onConflictDoUpdate({ target: t.demoSettings.id, set: { fixedTalkId: talkId } });
      return talk;
    },
  };
}

export type DemoSettings = ReturnType<typeof createDemoSettings>;
