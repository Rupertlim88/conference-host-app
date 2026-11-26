// The attendee app's requests read the programme through the store, and a missing item is "not found".
import {
  AroundAbstractSchema,
  AroundScopeSchema,
  CodeInputSchema,
  DateInputSchema,
  DaySchema,
  HighlightInputSchema,
  HighlightSchema,
  IdInputSchema,
  MeetingSchema,
  NamePageInputSchema,
  NameSectionSchema,
  NoteInputSchema,
  NoteSchema,
  PersonDetailSchema,
  PersonSchema,
  RelatedTalksSchema,
  SavedNoteSchema,
  ScheduleSchema,
  SearchInputSchema,
  SearchResultsSchema,
  SessionDetailSchema,
  SessionSummarySchema,
  TalkDetailSchema,
  TargetSchema,
  TrackDetailSchema,
  TrackSchema,
  ViewerSchema,
} from "@repo/host-contracts";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router, viewerProcedure } from "./gate";
import { aroundAbstract } from "./around-abstract";
import { relatedTalks } from "./related";

export function found<T>(value: T | null, what: string): T {
  if (value === null) throw new TRPCError({ code: "NOT_FOUND", message: `${what} not found` });
  return value;
}

export const attendeeRoutes = {
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
    byCode: viewerProcedure
      .input(CodeInputSchema)
      .output(TrackDetailSchema)
      .query(async ({ ctx, input }) => found(await ctx.store.trackByCode(input.code), "Programme")),
  }),

  highlights: router({
    get: viewerProcedure
      .input(HighlightInputSchema)
      .output(HighlightSchema)
      .query(({ ctx, input }) => ctx.store.highlight(input.list)),
  }),

  names: router({
    get: viewerProcedure
      .input(NamePageInputSchema)
      .output(z.array(NameSectionSchema))
      .query(({ ctx, input }) => ctx.store.namePage(input.page)),
  }),

  improvements: router({
    aroundAbstract: viewerProcedure
      .input(AroundScopeSchema)
      .output(AroundAbstractSchema)
      .query(({ ctx, input }) => aroundAbstract(ctx.store, ctx.demo, ctx.api, input)),
  }),

  sessions: router({
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
      .output(SavedNoteSchema)
      .query(({ ctx, input }) => ctx.store.note(ctx.viewer.id, input)),
    save: viewerProcedure.input(NoteInputSchema).mutation(({ ctx, input }) => {
      const { body, ...target } = input;
      return ctx.store.saveNote(ctx.viewer.id, target, body);
    }),
    remove: viewerProcedure.input(TargetSchema).mutation(({ ctx, input }) => ctx.store.deleteNote(ctx.viewer.id, input)),
  }),
};
