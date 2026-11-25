// Each guest's stars and notes are their own, and are kept when a talk is withdrawn, but not shown.
import type { Note, Schedule, Target } from "@repo/host-contracts";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";

import type { Db } from "./connect";
import { toSessionSummary, toTalkSummary } from "./programme";
import { SOCIETY_TABLES, type Society, type SocietyTables } from "./tables";

export function createGuestData(db: Db, society: Society) {
  const t: SocietyTables = SOCIETY_TABLES[society];
  const sessionOrder = [asc(t.sessions.startsAt), asc(t.sessions.number), asc(t.sessions.id)];
  const talkOrder = [asc(t.talks.startsAt), asc(t.talks.sort), asc(t.talks.number)];
  /** A star or note on a withdrawn talk is kept, but never listed. */
  const shown = eq(t.talks.withdrawn, false);

  return {
    async star(userId: string, target: Target): Promise<void> {
      await db
        .insert(t.stars)
        .values({ userId, ...target })
        .onConflictDoNothing();
    },

    async unstar(userId: string, target: Target): Promise<void> {
      await db
        .delete(t.stars)
        .where(
          and(
            eq(t.stars.userId, userId),
            eq(t.stars.targetKind, target.targetKind),
            eq(t.stars.targetId, target.targetId),
          ),
        );
    },

    /** The person's starred talks and sessions; a withdrawn talk's star is kept but not listed. */
    async starred(userId: string): Promise<Target[]> {
      const rows = await db
        .select({ targetKind: t.stars.targetKind, targetId: t.stars.targetId })
        .from(t.stars)
        .leftJoin(t.talks, and(eq(t.stars.targetKind, "talk"), eq(t.stars.targetId, t.talks.id)))
        .where(and(eq(t.stars.userId, userId), or(isNull(t.talks.withdrawn), shown)));
      return rows as Target[];
    },

    async schedule(userId: string): Promise<Schedule> {
      const talks = await db
        .select({ talk: t.talks })
        .from(t.stars)
        .innerJoin(t.talks, and(eq(t.stars.targetKind, "talk"), eq(t.stars.targetId, t.talks.id), shown))
        .where(eq(t.stars.userId, userId))
        .orderBy(...talkOrder);
      const sessions = await db
        .select({ session: t.sessions })
        .from(t.stars)
        .innerJoin(t.sessions, and(eq(t.stars.targetKind, "session"), eq(t.stars.targetId, t.sessions.id)))
        .where(eq(t.stars.userId, userId))
        .orderBy(...sessionOrder);
      return {
        talks: talks.map((r) => toTalkSummary(r.talk)),
        sessions: sessions.map((r) => toSessionSummary(r.session)),
      };
    },

    async note(userId: string, target: Target): Promise<{ body: string; updatedAt: string } | null> {
      const [row] = await db
        .select({ body: t.notes.body, updatedAt: t.notes.updatedAt })
        .from(t.notes)
        .leftJoin(t.talks, and(eq(t.notes.targetKind, "talk"), eq(t.notes.targetId, t.talks.id)))
        .where(
          and(
            eq(t.notes.userId, userId),
            eq(t.notes.targetKind, target.targetKind),
            eq(t.notes.targetId, target.targetId),
            or(isNull(t.talks.withdrawn), shown),
          ),
        );
      return row ? { body: row.body, updatedAt: row.updatedAt.toISOString() } : null;
    },

    /** Saves the note, or deletes it when the body is blank. */
    async saveNote(userId: string, target: Target, body: string): Promise<void> {
      const where = and(
        eq(t.notes.userId, userId),
        eq(t.notes.targetKind, target.targetKind),
        eq(t.notes.targetId, target.targetId),
      );
      if (body.trim() === "") {
        await db.delete(t.notes).where(where);
        return;
      }
      await db
        .insert(t.notes)
        .values({ userId, ...target, body, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [t.notes.userId, t.notes.targetKind, t.notes.targetId],
          set: { body, updatedAt: new Date() },
        });
    },

    async deleteNote(userId: string, target: Target): Promise<void> {
      await db
        .delete(t.notes)
        .where(
          and(eq(t.notes.userId, userId), eq(t.notes.targetKind, target.targetKind), eq(t.notes.targetId, target.targetId)),
        );
    },

    /** The person's notes, newest first, each with the title of what it is on. */
    async notes(userId: string): Promise<Note[]> {
      const rows = await db
        .select({
          targetKind: t.notes.targetKind,
          targetId: t.notes.targetId,
          body: t.notes.body,
          updatedAt: t.notes.updatedAt,
          talkTitle: t.talks.title,
          sessionTitle: t.sessions.title,
        })
        .from(t.notes)
        .leftJoin(t.talks, and(eq(t.notes.targetKind, "talk"), eq(t.notes.targetId, t.talks.id)))
        .leftJoin(t.sessions, and(eq(t.notes.targetKind, "session"), eq(t.notes.targetId, t.sessions.id)))
        // A note on a withdrawn talk is kept but not listed; one on a talk no longer loaded is listed untitled.
        .where(and(eq(t.notes.userId, userId), or(isNull(t.talks.withdrawn), shown)))
        .orderBy(sql`${t.notes.updatedAt} desc`);
      return rows.map((r) => ({
        targetKind: r.targetKind as Target["targetKind"],
        targetId: r.targetId,
        body: r.body,
        updatedAt: r.updatedAt.toISOString(),
        title: r.talkTitle ?? r.sessionTitle ?? "",
      }));
    },
  };
}

export type GuestData = ReturnType<typeof createGuestData>;
