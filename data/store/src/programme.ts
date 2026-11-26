// The attendee app sees only the talks that are not withdrawn.
import type {
  Day,
  Highlight,
  HighlightList,
  Meeting,
  MenuProgramme,
  NamePage,
  NameSection,
  Person,
  PersonDetail,
  SearchResults,
  SessionDetail,
  SessionSummary,
  TalkDetail,
  TalkSummary,
  Track,
  TrackDetail,
} from "@repo/host-contracts";
import { and, arrayContains, asc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import type { Db } from "./connect";
import { SOCIETY_TABLES, type Society, type SocietyTables } from "./tables";

type SessionRow = SocietyTables["sessions"]["$inferSelect"];
type TalkRow = SocietyTables["talks"]["$inferSelect"];

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toSessionSummary(s: SessionRow): SessionSummary {
  return {
    id: s.id,
    number: s.number,
    title: s.title,
    kind: s.kind,
    format: s.format,
    startsAt: iso(s.startsAt),
    endsAt: iso(s.endsAt),
    room: s.room,
    building: s.building,
    trackIds: s.trackIds,
  };
}

export function toTalkSummary(t: TalkRow): TalkSummary {
  return {
    id: t.id,
    sessionId: t.sessionId,
    number: t.number,
    title: t.title,
    kind: t.kind as TalkSummary["kind"],
    startsAt: iso(t.startsAt),
    endsAt: iso(t.endsAt),
    room: t.room,
    building: t.building,
    booth: t.booth,
    presentingAuthor: t.presentingAuthor,
    authorLine: t.authorLine,
  };
}

/** Text for LIKE with %, _ and \ escaped, so typed text is never a pattern. */
export const likeText = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export function createProgramme(db: Db, society: Society) {
  const t: SocietyTables = SOCIETY_TABLES[society];
  const sessionOrder = [asc(t.sessions.startsAt), asc(t.sessions.number), asc(t.sessions.id)];
  const talkOrder = [asc(t.talks.startsAt), asc(t.talks.sort), asc(t.talks.number)];
  /** Every attendee read of talks goes through this: a withdrawn talk is left out everywhere. */
  const shown = eq(t.talks.withdrawn, false);
  /** People are listed only while one of their talks is shown. */
  const hasShownTalk = () =>
    exists(
      db
        .select({ one: sql`1` })
        .from(t.talkPeople)
        .innerJoin(t.talks, eq(t.talkPeople.talkId, t.talks.id))
        .where(and(eq(t.talkPeople.personId, t.people.id), shown)),
    );

  async function meeting(): Promise<Meeting> {
    const [m] = await db
      .select({
        name: t.meeting.name,
        startsOn: t.meeting.startsOn,
        endsOn: t.meeting.endsOn,
        timeZone: t.meeting.timeZone,
        venue: t.meeting.venue,
        city: t.meeting.city,
        about: t.meeting.about,
      })
      .from(t.meeting)
      .limit(1);
    if (!m) throw new Error(`no meeting loaded for ${society}`);
    return m;
  }

  async function trackWhere(where: SQL): Promise<TrackDetail | null> {
    const [track] = await db.select().from(t.tracks).where(where);
    if (!track) return null;
    const sessions = await db
      .select()
      .from(t.sessions)
      .where(arrayContains(t.sessions.trackIds, [track.id]))
      .orderBy(...sessionOrder);
    return { id: track.id, code: track.code, title: track.title, sessions: sessions.map(toSessionSummary) };
  }

  async function timeZone(): Promise<string> {
    return (await meeting()).timeZone;
  }

  return {
    meeting,

    /** One read, so the database counts as in use (the keep-alive route). */
    async ping(): Promise<void> {
      await db.select({ id: t.meeting.id }).from(t.meeting).limit(1);
    },

    async days(): Promise<Day[]> {
      const tz = await timeZone();
      // The date is worked out once in a subquery, so GROUP BY sees one expression, not three parameters.
      const dated = db
        .select({ date: sql<string>`to_char(${t.sessions.startsAt} at time zone ${tz}, 'YYYY-MM-DD')`.as("date") })
        .from(t.sessions)
        .where(sql`${t.sessions.startsAt} is not null`)
        .as("dated");
      return db
        .select({ date: dated.date, sessions: sql<number>`count(*)::int` })
        .from(dated)
        .groupBy(dated.date)
        .orderBy(dated.date);
    },

    async sessionsOn(date: string): Promise<SessionSummary[]> {
      const tz = await timeZone();
      const rows = await db
        .select()
        .from(t.sessions)
        .where(sql`to_char(${t.sessions.startsAt} at time zone ${tz}, 'YYYY-MM-DD') = ${date}`)
        .orderBy(...sessionOrder);
      return rows.map(toSessionSummary);
    },

    /** The conferences list: every track but the listings of organisations, in AMS's order. */
    async tracks(): Promise<Track[]> {
      const rows = await db.select().from(t.tracks).where(eq(t.tracks.listed, true)).orderBy(asc(t.tracks.sort));
      return rows.map(({ id, code, title }) => ({ id, code, title }));
    },

    async track(id: string): Promise<TrackDetail | null> {
      return trackWhere(eq(t.tracks.id, id));
    },

    /** A programme AMS's menu opens by name, such as Events or the exhibit hall. */
    async trackByCode(code: MenuProgramme): Promise<TrackDetail | null> {
      return trackWhere(eq(t.tracks.code, code));
    },

    /** One of Program Highlights' lists: its sessions, or its shown talks. */
    async highlight(list: HighlightList): Promise<Highlight> {
      if (list === "themed" || list === "posters") {
        const where = list === "themed" ? eq(t.sessions.peopleThemed, true) : eq(t.sessions.format, "Poster");
        const rows = await db.select().from(t.sessions).where(where).orderBy(...sessionOrder);
        return { sessions: rows.map(toSessionSummary), talks: [] };
      }
      const flag = { supplementary: t.talks.supplementary, keynotes: t.talks.coreKeynote, fellows: t.talks.newFellow }[list];
      const rows = await db.select().from(t.talks).where(and(shown, eq(flag, true))).orderBy(asc(t.talks.startsAt), asc(t.talks.sort));
      return { sessions: [], talks: rows.map(toTalkSummary) };
    },

    /** The officers or committees page: each heading with its lines of names, in order. */
    async namePage(page: NamePage): Promise<NameSection[]> {
      return db
        .select({ heading: t.infoLists.heading, lines: t.infoLists.lines })
        .from(t.infoLists)
        .where(eq(t.infoLists.page, page))
        .orderBy(asc(t.infoLists.position));
    },

    /** The tracks each of these talks, among the shown ones, is in, by talk id, in the conferences list's order. */
    async tracksOfTalks(talkIds: string[]): Promise<Record<string, Track[]>> {
      if (talkIds.length === 0) return {};
      const talks = await db.select({ id: t.talks.id, trackIds: t.talks.trackIds }).from(t.talks).where(and(shown, inArray(t.talks.id, talkIds)));
      const trackIds = [...new Set(talks.flatMap((talk) => talk.trackIds))];
      const tracks = trackIds.length
        ? await db
            .select({ id: t.tracks.id, code: t.tracks.code, title: t.tracks.title })
            .from(t.tracks)
            .where(inArray(t.tracks.id, trackIds))
            .orderBy(asc(t.tracks.sort))
        : [];
      return Object.fromEntries(talks.map((talk) => [talk.id, tracks.filter((track) => talk.trackIds.includes(track.id))]));
    },

    async session(id: string): Promise<SessionDetail | null> {
      const [s] = await db.select().from(t.sessions).where(eq(t.sessions.id, id));
      if (!s) return null;
      const tracks = s.trackIds.length
        ? await db.select().from(t.tracks).where(inArray(t.tracks.id, s.trackIds)).orderBy(asc(t.tracks.sort))
        : [];
      const talks = await db
        .select()
        .from(t.talks)
        .where(and(eq(t.talks.sessionId, id), shown))
        .orderBy(asc(t.talks.sort), ...talkOrder);
      return {
        ...toSessionSummary(s),
        description: s.description,
        chairs: s.chairs,
        tracks: tracks.map(({ id: trackId, code, title }) => ({ id: trackId, code, title })),
        talks: talks.map(toTalkSummary),
      };
    },

    async talk(id: string): Promise<TalkDetail | null> {
      const [row] = await db
        .select()
        .from(t.talks)
        .where(and(eq(t.talks.id, id), shown));
      if (!row) return null;
      const [session] = row.sessionId
        ? await db.select().from(t.sessions).where(eq(t.sessions.id, row.sessionId))
        : [];
      return {
        ...toTalkSummary(row),
        abstract: row.abstract,
        affiliations: row.affiliations,
        doi: row.doi,
        citation: row.citation,
        trackIds: row.trackIds,
        session: session ? toSessionSummary(session) : null,
      };
    },

    /** Summaries in the order of `ids`; unknown ids are skipped. */
    async talkSummaries(ids: string[]): Promise<TalkSummary[]> {
      if (ids.length === 0) return [];
      const rows = await db
        .select()
        .from(t.talks)
        .where(and(inArray(t.talks.id, ids), shown));
      const byId = new Map(rows.map((r) => [r.id, toTalkSummary(r)]));
      return ids.map((id) => byId.get(id)).filter((x): x is TalkSummary => x !== undefined);
    },

    async people(): Promise<Person[]> {
      return db.select().from(t.people).where(hasShownTalk()).orderBy(asc(t.people.name));
    },

    async person(id: string): Promise<PersonDetail | null> {
      const [p] = await db.select().from(t.people).where(and(eq(t.people.id, id), hasShownTalk()));
      if (!p) return null;
      const talks = await db
        .select({ talk: t.talks })
        .from(t.talkPeople)
        .innerJoin(t.talks, eq(t.talkPeople.talkId, t.talks.id))
        .where(and(eq(t.talkPeople.personId, id), shown))
        .orderBy(...talkOrder);
      return { ...p, talks: talks.map((r) => toTalkSummary(r.talk)) };
    },

    async search(q: string): Promise<SearchResults> {
      const like = likeText(q);
      const [talks, sessions, people] = await Promise.all([
        db
          .select()
          .from(t.talks)
          .where(
            and(
              or(
                ilike(t.talks.title, like),
                ilike(t.talks.number, like),
                ilike(t.talks.presentingAuthor, like),
                ilike(t.talks.authorLine, like),
                ilike(t.talks.abstract, like),
              ),
              shown,
            ),
          )
          .orderBy(...talkOrder)
          .limit(50),
        db
          .select()
          .from(t.sessions)
          .where(or(ilike(t.sessions.title, like), ilike(t.sessions.number, like)))
          .orderBy(...sessionOrder)
          .limit(20),
        db
          .select()
          .from(t.people)
          .where(and(ilike(t.people.name, like), hasShownTalk()))
          .orderBy(asc(t.people.name))
          .limit(20),
      ]);
      return { talks: talks.map(toTalkSummary), sessions: sessions.map(toSessionSummary), people };
    },

    /** Every shown talk, with what the conference API's talk upload needs. A sync that completes withdraws the
     *  rest at the API. */
    async talksForSync() {
      const rows = await db
        .select({ talk: t.talks, sessionTitle: t.sessions.title, sessionFormat: t.sessions.format })
        .from(t.talks)
        .leftJoin(t.sessions, eq(t.talks.sessionId, t.sessions.id))
        .where(shown)
        .orderBy(asc(t.talks.id));
      return rows.map((r) => ({ ...r.talk, sessionTitle: r.sessionTitle, sessionFormat: r.sessionFormat }));
    },

  };
}

export type ProgrammeStore = ReturnType<typeof createProgramme>;
