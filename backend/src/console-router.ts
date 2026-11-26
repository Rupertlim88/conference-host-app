// The consoles' requests carry out the organiser's and developer's actions, and name every refusal.
import {
  ApiStatusSchema,
  ChangesSchema,
  ConnectionTestSchema,
  FixedAbstractInputSchema,
  IdInputSchema,
  MoveTalkInputSchema,
  OrganiserSessionDetailSchema,
  OrganiserTalkSchema,
  ResetResultSchema,
  SessionChangeInputSchema,
  SessionListInputSchema,
  SessionListSchema,
  SyncRunSchema,
  TalkListInputSchema,
  TalkListSchema,
  TalkSummarySchema,
} from "@repo/host-contracts";
import { zonedInstant } from "@repo/host-store";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { found } from "./attendee-router";
import { router, viewerProcedure, type Context } from "./gate";
import { connectionStatus } from "./matching-api";
import { placeInSession, sessionShift, sessionTimesProblem } from "./organiser-rules";
import { SendFailed, SendRunning, sendProgramme } from "./send";

/** The talk as the organiser sees it after an edit; NOT_FOUND when the edit found no talk. */
async function editedTalk(ctx: Context, id: string, wrote: boolean) {
  if (!wrote) found(null, "Talk");
  return found(await ctx.organiser.talk(id), "Talk");
}

export const organiserRouter = router({
  talks: router({
    list: viewerProcedure
      .input(TalkListInputSchema)
      .output(TalkListSchema)
      .query(({ ctx, input }) => ctx.organiser.talks(input)),
    get: viewerProcedure
      .input(IdInputSchema)
      .output(OrganiserTalkSchema)
      .query(async ({ ctx, input }) => found(await ctx.organiser.talk(input.id), "Talk")),
    /** Into another session: the session's room, after its last shown talk (organiser-rules placeInSession).
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

export const developerRouter = router({
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
  fixedAbstract: viewerProcedure.output(TalkSummarySchema.nullable()).query(({ ctx }) => ctx.demo.fixedAbstract()),
  setFixedAbstract: viewerProcedure
    .input(FixedAbstractInputSchema)
    .output(TalkSummarySchema)
    .mutation(async ({ ctx, input }) => {
      const talk = await ctx.demo.setFixedAbstract(input.talkId);
      if (talk) return talk;
      throw new TRPCError({ code: "BAD_REQUEST", message: "That talk cannot be the demo's abstract: it must be shown, and have an abstract." });
    }),
});
