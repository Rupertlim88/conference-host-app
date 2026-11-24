import {
  ApiStatusSchema,
  OrganiserSessionDetailSchema,
  OrganiserSessionSchema,
  OrganiserTalkSchema,
  SessionListSchema,
  SyncRunSchema,
  TalkListSchema,
  type ApiStatus,
  type Changes,
  type OrganiserSession,
  type OrganiserSessionDetail,
  type OrganiserTalk,
  type SessionList,
  type SyncRun,
  type TalkList,
  DaySchema,
  MeetingSchema,
  NoteSchema,
  PersonSchema,
  SessionDetailSchema,
  SessionSummarySchema,
  TalkDetailSchema,
  TalkSummarySchema,
  TrackDetailSchema,
  TrackSchema,
  type Day,
  type Meeting,
  type Note,
  type Person,
  type SessionDetail,
  type SessionSummary,
  type TalkDetail,
  type TalkSummary,
  type Track,
  type TrackDetail,
} from "@repo/host-contracts";

// Real records from the GSA Connects 2026 programme, the ones the verify skill uses. Every builder parses through the contract, so a fixture that drifts from it fails.

export const sessionSummary = (over: Partial<SessionSummary> = {}): SessionSummary =>
  SessionSummarySchema.parse({
    id: "96389",
    number: "173",
    title: "T104. Advances in hydrologic modeling",
    kind: "Topical Sessions",
    format: "Oral",
    startsAt: "2026-10-12T19:30:00.000Z",
    endsAt: "2026-10-12T23:30:00.000Z",
    room: "CCC, 111",
    building: "",
    trackIds: [],
    ...over,
  });

export const talkSummary = (over: Partial<TalkSummary> = {}): TalkSummary =>
  TalkSummarySchema.parse({
    id: "16121",
    sessionId: "96389",
    number: "173-1",
    title: "Multi-Objective Optimization with Groundwater Models: Framing Complex Results for Resource Management Decisions",
    kind: "oral",
    startsAt: "2026-10-12T19:35:00.000Z",
    endsAt: "2026-10-12T19:55:00.000Z",
    room: "CCC, 111",
    building: "",
    booth: "",
    presentingAuthor: "Nicholas Corson-Dosch",
    authorLine: "Corson-Dosch, Nicholas T [1]",
    ...over,
  });

export const talkDetail = (over: Partial<TalkDetail> = {}): TalkDetail =>
  TalkDetailSchema.parse({
    ...talkSummary(),
    abstract: "Groundwater management decisions require balancing competing objectives under uncertainty.\n\nWe frame the results for managers.",
    affiliations: ["(1) U.S. Geological Survey, Upper Midwest Water Science Center, Madison, WI, USA"],
    doi: "10.1130/abs/2026AM-16121",
    citation: "Geological Society of America Abstracts with Programs. Vol. 58, No. 5, 2026",
    trackIds: [],
    session: sessionSummary(),
    ...over,
  });

export const sessionDetail = (over: Partial<SessionDetail> = {}): SessionDetail =>
  SessionDetailSchema.parse({
    ...sessionSummary(),
    description: "Recent advances in hydrologic modeling; especially practical applications for decision support.",
    chairs: "Andrew Leaf, Anna Fehling",
    tracks: [{ id: "discipline-hydrogeology", code: "", title: "Discipline > Hydrogeology" }],
    talks: [
      talkSummary(),
      talkSummary({ id: "16000", number: "173-2", title: "Calibrating Regional Groundwater Models", startsAt: "2026-10-12T19:55:00.000Z", endsAt: "2026-10-12T20:15:00.000Z", authorLine: "Leaf, Andrew [1]" }),
    ],
    ...over,
  });

export const days = (): Day[] => ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"].map((date) => DaySchema.parse({ date, sessions: 10 }));

export const meeting = (over: Partial<Meeting> = {}): Meeting =>
  MeetingSchema.parse({
    name: "GSA Connects 2026",
    startsOn: "2026-10-11",
    endsOn: "2026-10-14",
    timeZone: "America/Denver",
    venue: "Colorado Convention Center",
    city: "Denver, CO",
    about: "The Geological Society of America's annual meeting, at the Colorado Convention Center in Denver.",
    ...over,
  });

export const track = (over: Partial<Track> = {}): Track =>
  TrackSchema.parse({ id: "discipline-hydrogeology", code: "", title: "Discipline > Hydrogeology", ...over });

export const trackDetail = (over: Partial<TrackDetail> = {}): TrackDetail => TrackDetailSchema.parse({ ...track(), sessions: [sessionSummary()], ...over });

export const person = (over: Partial<Person> = {}): Person =>
  PersonSchema.parse({ id: "nicholas-corson-dosch", name: "Nicholas Corson-Dosch", affiliation: "U.S. Geological Survey", ...over });

export const note = (over: Partial<Note> = {}): Note =>
  NoteSchema.parse({
    targetKind: "talk",
    targetId: "16121",
    body: "Ask about the emulators.",
    updatedAt: "2026-10-12T20:00:00.000Z",
    title: "Multi-Objective Optimization with Groundwater Models: Framing Complex Results for Resource Management Decisions",
    ...over,
  });

// ---- Organiser and developer consoles ----

export const organiserTalk = (over: Partial<OrganiserTalk> = {}): OrganiserTalk =>
  OrganiserTalkSchema.parse({
    ...talkSummary(),
    withdrawn: false,
    change: "none",
    sessionNumber: "173",
    sessionTitle: sessionSummary().title,
    ...over,
  });

export const talkList = (talks: OrganiserTalk[] = [organiserTalk()], over: Partial<TalkList> = {}): TalkList =>
  TalkListSchema.parse({ talks, total: talks.length, page: 1, ...over });

export const organiserSession = (over: Partial<OrganiserSession> = {}): OrganiserSession =>
  OrganiserSessionSchema.parse({ ...sessionSummary(), talks: 13, changed: false, ...over });

export const sessionList = (sessions: OrganiserSession[] = [organiserSession()], over: Partial<SessionList> = {}): SessionList =>
  SessionListSchema.parse({ sessions, total: sessions.length, page: 1, ...over });

export const organiserSessionDetail = (over: Partial<OrganiserSessionDetail> = {}): OrganiserSessionDetail =>
  OrganiserSessionDetailSchema.parse({
    ...sessionSummary(),
    description: "",
    chairs: "",
    tracks: [],
    talks: [organiserTalk(), organiserTalk({ id: "19115", number: "173-2", title: "A stochastic assessment", withdrawn: true })],
    changed: false,
    ...over,
  });

export const syncRun = (over: Partial<SyncRun> = {}): SyncRun =>
  SyncRunSchema.parse({
    id: 3,
    state: "sent",
    startedAt: "2026-10-12T15:00:00.000Z",
    finishedAt: "2026-10-12T15:00:20.000Z",
    sent: 3269,
    added: 0,
    changed: 2,
    withdrawn: 1,
    unchanged: 3266,
    programmeVersion: "pv_jjyoujW2yRoabJsIlr-kog",
    error: "",
    ...over,
  });

export const noChanges = (): Changes => ({ moved: 0, rescheduled: 0, withdrawn: 0, sessions: 0 });

export const apiStatus = (over: Partial<ApiStatus> = {}): ApiStatus =>
  ApiStatusSchema.parse({
    apiAddress: "https://api.example.org/",
    keySet: true,
    lastRun: syncRun(),
    changes: { moved: 1, rescheduled: 2, withdrawn: 1, sessions: 1 },
    ...over,
  });
