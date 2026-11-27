// The latest test set says which talks the demo holds.
import type { TestSet } from "@repo/host-contracts";
import { getTableColumns, inArray, sql } from "drizzle-orm";

import type { Db } from "./connect";
import { fixAbstract } from "./demo-settings";
import type { Tx } from "./load";
import { SOCIETY_TABLES, type Society, type SocietyTables } from "./tables";

/** Makes the demo hold exactly these talks of AMS's whole programme, as published and none withdrawn, with their
 *  people, in place of the talks it held. Organisers' edits to talks go with them; stars and notes stay, as they
 *  name their talks by id. Sessions and tracks are left as they are, since the demo always keeps them all. */
export async function holdTalks(tx: Tx, t: SocietyTables, ids: string[]): Promise<void> {
  const w = t.wholeTalks;
  const held = inArray(w.id, ids);
  await tx.delete(t.talks);
  await tx.delete(t.people);
  // The fields in the order of the talks table: its published columns, then its live state, as published.
  const asPublished = {
    ...getTableColumns(w),
    withdrawn: sql<boolean>`false`.as("withdrawn"),
    pubSessionId: w.sessionId,
    pubStartsAt: w.startsAt,
    pubEndsAt: w.endsAt,
    pubRoom: w.room,
    pubBuilding: w.building,
    pubSort: w.sort,
  };
  await tx.insert(t.talks).select(tx.select(asPublished).from(w).where(held));
  const heldLinks = inArray(t.wholeTalkPeople.talkId, ids);
  const speakers = tx.select({ id: t.wholeTalkPeople.personId }).from(t.wholeTalkPeople).where(heldLinks);
  await tx.insert(t.people).select(tx.select().from(t.wholePeople).where(inArray(t.wholePeople.id, speakers)));
  await tx
    .insert(t.talkPeople)
    .select(tx.select({ talkId: t.wholeTalkPeople.talkId, personId: t.wholeTalkPeople.personId }).from(t.wholeTalkPeople).where(heldLinks));
}

export function createTestSets(db: Db, society: Society) {
  const t = SOCIETY_TABLES[society];
  return {
    /** The latest test set, with its layout when it has one, or null until one arrives. */
    async latest(): Promise<TestSet | null> {
      const [row] = await db
        .select({ conference: t.testSet.conference, askers: t.testSet.askers, talks: t.testSet.talks, layout: t.testSet.layout })
        .from(t.testSet);
      if (!row) return null;
      const { layout, ...rest } = row;
      return layout ? { ...rest, layout } : rest;
    },

    /** Stores the test set in place of the one before, and in the same step restarts the demo's programme: every
     *  session back as published, exactly the test set's talks held, and the demo fixed to its first abstract, as the
     *  developer console fixes it, or left as it was when that abstract cannot be fixed. The backend checks the test
     *  set against the whole programme first. */
    async hold(testSet: TestSet): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.update(t.sessions).set({
          startsAt: sql`${t.sessions.pubStartsAt}`,
          endsAt: sql`${t.sessions.pubEndsAt}`,
          room: sql`${t.sessions.pubRoom}`,
          building: sql`${t.sessions.pubBuilding}`,
        });
        await holdTalks(tx, t, testSet.talks);
        await fixAbstract(tx, t, testSet.askers[0]!);
        const row = { conference: testSet.conference, askers: testSet.askers, talks: testSet.talks, layout: testSet.layout ?? null, storedAt: new Date() };
        await tx.insert(t.testSet).values({ id: 1, ...row }).onConflictDoUpdate({ target: t.testSet.id, set: row });
      });
    },
  };
}

export type TestSets = ReturnType<typeof createTestSets>;
