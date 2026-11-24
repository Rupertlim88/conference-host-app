import {
  ApiStatusSchema,
  ChangesSchema,
  ConnectionTestSchema,
  DateInputSchema,
  DaySchema,
  IdInputSchema,
  KindInputSchema,
  MeetingSchema,
  MoveTalkInputSchema,
  NoteInputSchema,
  NoteSchema,
  OrganiserSessionDetailSchema,
  OrganiserTalkSchema,
  PersonDetailSchema,
  PersonSchema,
  RelatedTalksSchema,
  ResetResultSchema,
  ScheduleSchema,
  SearchInputSchema,
  SearchResultsSchema,
  SessionChangeInputSchema,
  SessionDetailSchema,
  SessionKindSchema,
  SessionListInputSchema,
  SessionListSchema,
  SessionSummarySchema,
  SyncRunSchema,
  TalkDetailSchema,
  TalkListInputSchema,
  TalkListSchema,
  TargetSchema,
  TrackDetailSchema,
  TrackSchema,
  ViewerSchema,
} from "@repo/host-contracts";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { zonedInstant } from "@repo/host-store";

import { connectionStatus, placeInSession, sessionShift, sessionTimesProblem } from "./programme-rules";
import { relatedTalks } from "./related";
import { SendFailed, SendRunning, sendProgramme } from "./send";
import { createCallerFactory, publicProcedure, router, viewerProcedure, type Context } from "./trpc";

function found<T>(value: T | null, what: string): T {
  if (value === null) throw new TRPCError({ code: "NOT_FOUND", message: `${what} not found` });
  return value;
}

/** The talk as the organiser sees it after an edit; NOT_FOUND when the edit found no talk. */
async function editedTalk(ctx: Context, id: string, wrote: boolean) {
  if (!wrote) found(null, "Talk");
  return found(await ctx.organiser.talk(id), "Talk");
}

const organiserRouter = router({
  talks: router({
    list: viewerProcedure
      .input(TalkListInputSchema)
      .output(TalkListSchema)
      .query(({ ctx, input }) => ctx.organiser.talks(input)),
    get: viewerProcedure
      .input(IdInputSchema)
      .output(OrganiserTalkSchema)
      .query(async ({ ctx, input }) => found(await ctx.organiser.talk(input.id), "Talk")),
    /** Into another session: the session's room, after its last shown talk (programme-rules placeInSession).
     *  A move into the talk's own session changes nothing. */
    move: viewerProcedure
      .input(MoveTalkInputSchema)
      .output(OrganiserTalkSchema)
      .mutation(async ({ ctx, input }) => {
        const moved = await ctx.organiser.moveTalk(input.id, input.sessionId, (f) => placeInSession(f.talk, f.session, f.tail));
        if (!moved) found(null, "Talk or session");
        return found(await ctx.organiser.talk(input.id), "Talk");
      }),
    withdraw: viewerProcedure
      .input(IdInputSchema)
      .output(OrganiserTalkSchema)
      .mutation(async ({ ctx, input }) => editedTalk(ctx, input.id, await ctx.organiser.setWithdrawn(input.id, true))),
    restore: viewerProcedure
      .input(IdInputSchema)
      .output(OrganiserTalkSchema)
      .mutation(async ({ ctx, input }) => editedTalk(ctx, input.id, await ctx.organiser.setWithdrawn(input.id, false))),
  }),

  sessions: router({
    list: viewerProcedure
      .input(SessionListInputSchema)
      .output(SessionListSchema)
      .query(({ ctx, input }) => ctx.organiser.sessions(input)),
    get: viewerProcedure
      .input(IdInputSchema)
      .output(OrganiserSessionDetailSchema)
      .query(async ({ ctx, input }) => found(await ctx.organiser.session(input.id), "Session")),
    /** New times in the meeting's time zone, and a room. Empty times leave the session untimed or with no end.
     *  Refused with the problem's name as the message: incomplete-time, end-before-start or outside-meeting. */
    change: viewerProcedure
      .input(SessionChangeInputSchema)
      .output(OrganiserSessionDetailSchema)
      .mutation(async ({ ctx, input }) => {
        const meeting = await ctx.store.meeting();
        const published = await ctx.organiser.publishedDays(meeting.timeZone);
        const span = {
          startsOn: published && published.first < meeting.startsOn ? published.first : meeting.startsOn,
          endsOn: published && published.last > meeting.endsOn ? published.last : meeting.endsOn,
        };
        const problem = sessionTimesProblem(span, input);
        if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
        const at = (clock: string) => (input.date && clock ? zonedInstant(input.date, clock, meeting.timeZone) : null);
        const startsAt = at(input.start);
        const endsAt = at(input.end);
        const saved = await ctx.organiser.changeSession(input.id, { startsAt, endsAt, room: input.room }, (old) =>
          sessionShift(old, startsAt),
        );
        if (!saved) found(null, "Session");
        return found(await ctx.organiser.session(input.id), "Session");
      }),
  }),

  programme: router({
    changes: viewerProcedure.output(ChangesSchema).query(({ ctx }) => ctx.organiser.changes()),
    runs: viewerProcedure.output(z.array(SyncRunSchema)).query(({ ctx }) => ctx.log.runs()),
    /** Sends the shown programme and returns the run, failed or sent. CONFLICT while another send runs. */
    send: viewerProcedure.output(SyncRunSchema).mutation(async ({ ctx }) => {
      try {
        return await sendProgramme({ store: ctx.store, log: ctx.log, api: ctx.api });
      } catch (error) {
        if (error instanceof SendFailed) return error.run;
        if (error instanceof SendRunning) throw new TRPCError({ code: "CONFLICT", message: error.message });
        throw error;
      }
    }),
  }),
});

const developerRouter = router({
  status: viewerProcedure.output(ApiStatusSchema).query(async ({ ctx }) => ({
    ...ctx.settings,
    lastRun: (await ctx.log.runs())[0] ?? null,
    changes: await ctx.organiser.changes(),
  })),
  /** One matches:search for a shown talk. Writes nothing. */
  testConnection: viewerProcedure.output(ConnectionTestSchema).mutation(async ({ ctx }) => {
    const talkId = await ctx.organiser.sampleTalkId();
    if (talkId === null) return { status: "no-programme" as const, httpStatus: null, ms: null };
    const { outcome, ms } = await ctx.api.check(talkId);
    return {
      status: connectionStatus(outcome),
      httpStatus: outcome.kind === "answered" ? outcome.httpStatus : null,
      ms: outcome.kind === "not-set" ? null : ms,
    };
  }),
  reset: viewerProcedure.output(ResetResultSchema).mutation(({ ctx }) => ctx.organiser.resetToPublished()),
});

export const appRouter = router({
  organiser: organiserRouter,
  developer: developerRouter,

  viewer: router({
    get: publicProcedure.output(ViewerSchema.nullable()).query(({ ctx }) =>
      ctx.viewer ? { name: ctx.viewer.name, email: ctx.viewer.email, image: ctx.viewer.image } : null,
    ),
  }),

  meeting: router({
    get: viewerProcedure.output(MeetingSchema).query(({ ctx }) => ctx.store.meeting()),
  }),

  days: router({
    list: viewerProcedure.output(z.array(DaySchema)).query(({ ctx }) => ctx.store.days()),
    sessions: viewerProcedure
      .input(DateInputSchema)
      .output(z.array(SessionSummarySchema))
      .query(({ ctx, input }) => ctx.store.sessionsOn(input.date)),
  }),

  tracks: router({
    list: viewerProcedure.output(z.array(TrackSchema)).query(({ ctx }) => ctx.store.tracks()),
    get: viewerProcedure
      .input(IdInputSchema)
      .output(TrackDetailSchema)
      .query(async ({ ctx, input }) => found(await ctx.store.track(input.id), "Track")),
  }),

  sessions: router({
    kinds: viewerProcedure.output(z.array(SessionKindSchema)).query(({ ctx }) => ctx.store.sessionKinds()),
    ofKind: viewerProcedure
      .input(KindInputSchema)
      .output(z.array(SessionSummarySchema))
      .query(({ ctx, input }) => ctx.store.sessionsOfKind(input.kind)),
    get: viewerProcedure
      .input(IdInputSchema)
      .output(SessionDetailSchema)
      .query(async ({ ctx, input }) => found(await ctx.store.session(input.id), "Session")),
  }),

  talks: router({
    get: viewerProcedure
      .input(IdInputSchema)
      .output(TalkDetailSchema)
      .query(async ({ ctx, input }) => found(await ctx.store.talk(input.id), "Talk")),
    /** The conference API's matches for a shown talk; NOT_FOUND for a withdrawn or unknown one. */
    related: viewerProcedure
      .input(IdInputSchema)
      .output(RelatedTalksSchema)
      .query(async ({ ctx, input }) => {
        if ((await ctx.store.talkSummaries([input.id])).length === 0) found(null, "Talk");
        return relatedTalks(ctx.store, ctx.api, input.id);
      }),
  }),

  people: router({
    list: viewerProcedure.output(z.array(PersonSchema)).query(({ ctx }) => ctx.store.people()),
    get: viewerProcedure
      .input(IdInputSchema)
      .output(PersonDetailSchema)
      .query(async ({ ctx, input }) => found(await ctx.store.person(input.id), "Person")),
  }),

  search: viewerProcedure
    .input(SearchInputSchema)
    .output(SearchResultsSchema)
    .query(({ ctx, input }) => ctx.store.search(input.q)),

  schedule: router({
    get: viewerProcedure.output(ScheduleSchema).query(({ ctx }) => ctx.store.schedule(ctx.viewer.id)),
    starred: viewerProcedure.output(z.array(TargetSchema)).query(({ ctx }) => ctx.store.starred(ctx.viewer.id)),
    star: viewerProcedure.input(TargetSchema).mutation(({ ctx, input }) => ctx.store.star(ctx.viewer.id, input)),
    unstar: viewerProcedure.input(TargetSchema).mutation(({ ctx, input }) => ctx.store.unstar(ctx.viewer.id, input)),
  }),

  notes: router({
    list: viewerProcedure.output(z.array(NoteSchema)).query(({ ctx }) => ctx.store.notes(ctx.viewer.id)),
    get: viewerProcedure
      .input(TargetSchema)
      .output(z.strictObject({ body: z.string(), updatedAt: z.iso.datetime() }).nullable())
      .query(({ ctx, input }) => ctx.store.note(ctx.viewer.id, input)),
    save: viewerProcedure.input(NoteInputSchema).mutation(({ ctx, input }) => {
      const { body, ...target } = input;
      return ctx.store.saveNote(ctx.viewer.id, target, body);
    }),
    remove: viewerProcedure.input(TargetSchema).mutation(({ ctx, input }) => ctx.store.deleteNote(ctx.viewer.id, input)),
  }),
});

export type AppRouter = typeof appRouter;

export const createHostCaller = createCallerFactory(appRouter);
/** The router called directly, as server components use it. */
export type HostCaller = ReturnType<typeof createHostCaller>;
