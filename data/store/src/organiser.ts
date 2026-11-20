import {
  PAGE_SIZE,
  type Changes,
  type OrganiserSessionDetail,
  type OrganiserTalk,
  type ResetResult,
  type SessionList,
  type TalkChange,
  type TalkList,
  type TalkStatusFilter,
} from "@repo/host-contracts";
import { and, asc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";

import type { Db } from "./db";
import { likeText, toSessionSummary, toTalkSummary } from "./queries";
import { SOCIETY_TABLES, type Society, type SocietyTables } from "./schema";

/** Where a talk goes in a session: worked out by the backend's programme rules, written here. */
export interface Placement {
  startsAt: Date | null;
  endsAt: Date | null;
  room: string;
  building: string;
  sort: number;
}

/** The facts the backend's placement rule needs to move a talk into a session, read under the session's lock. */
export interface PlacementFacts {
  talk: { kind: string; startsAt: Date | null; endsAt: Date | null };
  session: { startsAt: Date | null; endsAt: Date | null; room: string; building: string };
  /** The latest end and highest sort among the session's shown talks. */
  tail: { lastEnd: Date | null; lastSort: number | null };
}

/**
 * The organiser console's reads and edits for one society. Edits change the live programme and the withdrawn flag
 * only; the published columns stay as the loader wrote them, so a reset can always put them back.
 */
export function createOrganiserStore(db: Db, society: Society) {
  const t: SocietyTables = SOCIETY_TABLES[society];
  const talkOrder = [asc(t.talks.startsAt), asc(t.talks.sort), asc(t.talks.number), asc(t.talks.id)];
  const sessionOrder = [asc(t.sessions.startsAt), asc(t.sessions.number), asc(t.sessions.id)];

  const moved = sql`${t.talks.sessionId} is distinct from ${t.talks.pubSessionId}`;
  const rescheduled = sql`(${t.talks.startsAt}, ${t.talks.endsAt}, ${t.talks.room}, ${t.talks.building}, ${t.talks.sort})
    is distinct from (${t.talks.pubStartsAt}, ${t.talks.pubEndsAt}, ${t.talks.pubRoom}, ${t.talks.pubBuilding}, ${t.talks.pubSort})`;
  const talkChanged = or(moved, rescheduled)!;
  const sessionChanged = sql`(${t.sessions.startsAt}, ${t.sessions.endsAt}, ${t.sessions.room}, ${t.sessions.building})
    is distinct from (${t.sessions.pubStartsAt}, ${t.sessions.pubEndsAt}, ${t.sessions.pubRoom}, ${t.sessions.pubBuilding})`;
  const change = sql<TalkChange>`case when ${moved} then 'moved' when ${rescheduled} then 'rescheduled' else 'none' end`;

  const STATUS: Record<TalkStatusFilter, SQL | undefined> = {
    all: undefined,
    scheduled: eq(t.talks.withdrawn, false),
    withdrawn: eq(t.talks.withdrawn, true),
    changed: and(eq(t.talks.withdrawn, false), talkChanged),
  };

  function organiserTalks(where: SQL | undefined) {
    return db
      .select({ talk: t.talks, change, sessionNumber: t.sessions.number, sessionTitle: t.sessions.title })
      .from(t.talks)
      .leftJoin(t.sessions, eq(t.talks.sessionId, t.sessions.id))
      .where(where);
  }
  type Row = Awaited<ReturnType<typeof organiserTalks>>[number];
  const toOrganiserTalk = (r: Row): OrganiserTalk => ({
    ...toTalkSummary(r.talk),
    withdrawn: r.talk.withdrawn,
    change: r.change,
    sessionNumber: r.sessionNumber ?? "",
    sessionTitle: r.sessionTitle ?? "",
  });
  /** The asked-for page, or the last page when it asks for one past the end. */
  const pageWithin = (page: number, total: number) => Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const offset = (page: number) => (page - 1) * PAGE_SIZE;

  return {
    async talks(input: { q: string; status: TalkStatusFilter; sessionId?: string; page: number }): Promise<TalkList> {
      const like = likeText(input.q);
      const where = and(
        input.q
          ? or(
              ilike(t.talks.number, like),
              ilike(t.talks.title, like),
              ilike(t.talks.presentingAuthor, like),
              ilike(t.talks.authorLine, like),
            )
          : undefined,
        STATUS[input.status],
        input.sessionId ? eq(t.talks.sessionId, input.sessionId) : undefined,
      );
      const total = await db.$count(t.talks, where);
      const page = pageWithin(input.page, total);
      const rows = await organiserTalks(where)
        .orderBy(...talkOrder)
        .limit(PAGE_SIZE)
        .offset(offset(page));
      return { talks: rows.map(toOrganiserTalk), total, page };
    },

    async talk(id: string): Promise<OrganiserTalk | null> {
      const [row] = await organiserTalks(eq(t.talks.id, id));
      return row ? toOrganiserTalk(row) : null;
    },

    /** A shown talk that a send includes (not a break, and with an abstract), for a connection test. */
    async sampleTalkId(): Promise<string | null> {
      const [row] = await db
        .select({ id: t.talks.id })
        .from(t.talks)
        .where(and(eq(t.talks.withdrawn, false), ne(t.talks.kind, "break"), sql`trim(${t.talks.abstract}) <> ''`))
        .orderBy(asc(t.talks.id))
        .limit(1);
      return row?.id ?? null;
    },

    async sessions(input: { q: string; page: number }): Promise<SessionList> {
      const like = likeText(input.q);
      const where = input.q ? or(ilike(t.sessions.number, like), ilike(t.sessions.title, like)) : undefined;
      const shownTalks = db
        .select({ sessionId: t.talks.sessionId, n: sql<number>`count(*)::int`.as("n") })
        .from(t.talks)
        .where(eq(t.talks.withdrawn, false))
        .groupBy(t.talks.sessionId)
        .as("shown_talks");
      const total = await db.$count(t.sessions, where);
      const page = pageWithin(input.page, total);
      const rows = await db
        .select({ session: t.sessions, talks: shownTalks.n, changed: sql<boolean>`${sessionChanged}` })
        .from(t.sessions)
        .leftJoin(shownTalks, eq(shownTalks.sessionId, t.sessions.id))
        .where(where)
        .orderBy(...sessionOrder)
        .limit(PAGE_SIZE)
        .offset(offset(page));
      return {
        sessions: rows.map((r) => ({ ...toSessionSummary(r.session), talks: r.talks ?? 0, changed: r.changed })),
        total,
        page,
      };
    },

    /** A session with every talk in it, withdrawn ones included. */
    async session(id: string): Promise<OrganiserSessionDetail | null> {
      const [row] = await db
        .select({ session: t.sessions, changed: sql<boolean>`${sessionChanged}` })
        .from(t.sessions)
        .where(eq(t.sessions.id, id));
      if (!row) return null;
      const s = row.session;
      const tracks = s.trackIds.length
        ? await db.select().from(t.tracks).where(inArray(t.tracks.id, s.trackIds)).orderBy(asc(t.tracks.sort))
        : [];
      const talks = await organiserTalks(eq(t.talks.sessionId, id)).orderBy(asc(t.talks.sort), ...talkOrder);
      return {
        ...toSessionSummary(s),
        description: s.description,
        chairs: s.chairs,
        tracks: tracks.map(({ id: trackId, code, title }) => ({ id: trackId, code, title })),
        talks: talks.map(toOrganiserTalk),
        changed: row.changed,
      };
    },

    /**
     * Moves a talk into a session, placed by `place` (the backend's placeInSession), in one transaction that locks
     * the session's row first: two moves into one session take turns, so the second sees the first. A move into the
     * talk's own session changes nothing. False when the talk or the session is unknown.
     */
    async moveTalk(
      talkId: string,
      sessionId: string,
      place: (facts: PlacementFacts) => Placement | Promise<Placement>,
    ): Promise<boolean> {
      return db.transaction(async (tx) => {
        const [session] = await tx
          .select({ startsAt: t.sessions.startsAt, endsAt: t.sessions.endsAt, room: t.sessions.room, building: t.sessions.building })
          .from(t.sessions)
          .where(eq(t.sessions.id, sessionId))
          .for("update");
        const [talk] = await tx
          .select({ kind: t.talks.kind, startsAt: t.talks.startsAt, endsAt: t.talks.endsAt, sessionId: t.talks.sessionId })
          .from(t.talks)
          .where(eq(t.talks.id, talkId));
        if (!talk || !session) return false;
        if (talk.sessionId === sessionId) return true;
        const [tail] = await tx
          .select({
            lastEnd: sql<Date | null>`max(${t.talks.endsAt})`.mapWith(t.talks.endsAt),
            lastSort: sql<number | null>`max(${t.talks.sort})`,
          })
          .from(t.talks)
          .where(and(eq(t.talks.sessionId, sessionId), eq(t.talks.withdrawn, false)));
        const placement = await place({
          talk: { kind: talk.kind, startsAt: talk.startsAt, endsAt: talk.endsAt },
          session,
          tail: { lastEnd: tail?.lastEnd ?? null, lastSort: tail?.lastSort ?? null },
        });
        await tx
          .update(t.talks)
          .set({ sessionId, ...placement })
          .where(eq(t.talks.id, talkId));
        return true;
      });
    },

    /** False when the talk is unknown. */
    async setWithdrawn(id: string, withdrawn: boolean): Promise<boolean> {
      const rows = await db.update(t.talks).set({ withdrawn }).where(eq(t.talks.id, id)).returning({ id: t.talks.id });
      return rows.length > 0;
    },

    /**
     * Gives a session new times and a room, in one transaction that locks the session's row first. `shiftOf` (the
     * backend's sessionShift) gets the start it locked and says how far every talk moves, or null for not at all;
     * two saves at once therefore each shift from the start the other left. Every talk moves to the new room. When
     * the session has a start, a talk with no time takes the session's times, as placeInSession gives a talk with no
     * length. False when the session is unknown.
     */
    async changeSession(
      id: string,
      times: { startsAt: Date | null; endsAt: Date | null; room: string },
      shiftOf: (oldStart: Date | null) => number | null | Promise<number | null>,
    ): Promise<boolean> {
      return db.transaction(async (tx) => {
        const [old] = await tx.select({ startsAt: t.sessions.startsAt }).from(t.sessions).where(eq(t.sessions.id, id)).for("update");
        if (!old) return false;
        await tx.update(t.sessions).set(times).where(eq(t.sessions.id, id));
        const shiftMs = await shiftOf(old.startsAt);
        const shift = shiftMs === null ? null : sql`make_interval(secs => ${shiftMs / 1000})`;
        await tx
          .update(t.talks)
          .set({
            room: times.room,
            ...(shift ? { startsAt: sql`${t.talks.startsAt} + ${shift}`, endsAt: sql`${t.talks.endsAt} + ${shift}` } : {}),
          })
          .where(eq(t.talks.sessionId, id));
        if (times.startsAt) {
          await tx
            .update(t.talks)
            .set({ startsAt: times.startsAt, endsAt: times.endsAt })
            .where(and(eq(t.talks.sessionId, id), isNull(t.talks.startsAt)));
        }
        return true;
      });
    },

    /** The first and last days of the published programme in the meeting's zone; null when no session has a time. */
    async publishedDays(timeZone: string): Promise<{ first: string; last: string } | null> {
      const day = (edge: "min" | "max") =>
        sql<string | null>`to_char(${sql.raw(edge)}(${t.sessions.pubStartsAt} at time zone ${timeZone}), 'YYYY-MM-DD')`;
      const [row] = await db.select({ first: day("min"), last: day("max") }).from(t.sessions);
      return row?.first && row.last ? { first: row.first, last: row.last } : null;
    },

    async changes(): Promise<Changes> {
      const [talks] = await db
        .select({
          withdrawn: sql<number>`count(*) filter (where ${t.talks.withdrawn})::int`,
          moved: sql<number>`count(*) filter (where not ${t.talks.withdrawn} and ${moved})::int`,
          rescheduled: sql<number>`count(*) filter (where not ${t.talks.withdrawn} and not ${moved} and ${rescheduled})::int`,
        })
        .from(t.talks);
      return { ...talks!, sessions: await db.$count(t.sessions, sessionChanged) };
    },

    /** Copies the published programme back over every edited talk and session and restores withdrawn talks, in
     *  one transaction. Stars and notes stay, because they key on ids. A second reset changes nothing. */
    async resetToPublished(): Promise<ResetResult> {
      return db.transaction(async (tx) => {
        // Sessions before talks: the order in which every edit takes its locks, so a reset never deadlocks one.
        const sessions = await tx
          .update(t.sessions)
          .set({
            startsAt: sql`${t.sessions.pubStartsAt}`,
            endsAt: sql`${t.sessions.pubEndsAt}`,
            room: sql`${t.sessions.pubRoom}`,
            building: sql`${t.sessions.pubBuilding}`,
          })
          .where(sessionChanged)
          .returning({ id: t.sessions.id });
        const talks = await tx
          .update(t.talks)
          .set({
            sessionId: sql`${t.talks.pubSessionId}`,
            startsAt: sql`${t.talks.pubStartsAt}`,
            endsAt: sql`${t.talks.pubEndsAt}`,
            room: sql`${t.talks.pubRoom}`,
            building: sql`${t.talks.pubBuilding}`,
            sort: sql`${t.talks.pubSort}`,
            withdrawn: false,
          })
          .where(or(eq(t.talks.withdrawn, true), talkChanged))
          .returning({ id: t.talks.id });
        return { talks: talks.length, sessions: sessions.length };
      });
    },
  };
}

export type OrganiserStore = ReturnType<typeof createOrganiserStore>;
