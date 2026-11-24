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
  PersonDetailSchema,
  PersonSchema,
  SessionDetailSchema,
  SessionSummarySchema,
  TalkDetailSchema,
  TalkSummarySchema,
  TrackDetailSchema,
  TrackSchema,
  type Day,
  type Meeting,
  type Person,
  type PersonDetail,
  type SessionDetail,
  type SessionSummary,
  type TalkDetail,
  type TalkSummary,
  type Track,
  type TrackDetail,
} from "@repo/host-contracts";

// Real records from the AMS 2027 programme: joint session J1 (77102) and its paper J1.2 (493803). Every builder parses through the contract, so a fixture that drifts from it fails.

export const sessionSummary = (over: Partial<SessionSummary> = {}): SessionSummary =>
  SessionSummarySchema.parse({
    id: "77102",
    number: "J1",
    title: "Decision Support I: Winter Weather and Cold-Season Hazards",
    kind: "Joint Session",
    format: "",
    startsAt: "2027-01-11T15:30:00.000Z",
    endsAt: "2027-01-11T17:00:00.000Z",
    room: "403",
    building: "Colorado Convention Center",
    trackIds: [],
    ...over,
  });

export const talkSummary = (over: Partial<TalkSummary> = {}): TalkSummary =>
  TalkSummarySchema.parse({
    id: "493803",
    sessionId: "77102",
    number: "J1.2",
    title: "What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us.",
    kind: "oral",
    startsAt: "2027-01-11T15:45:00.000Z",
    endsAt: "2027-01-11T16:00:00.000Z",
    room: "403",
    building: "Colorado Convention Center",
    booth: "",
    presentingAuthor: "Andrew A. Rosenow",
    authorLine: "Andrew A. Rosenow, CIWRO - Cooperative Institute for Severe and High Impact Weather Research and Operations, Norman, OK",
    ...over,
  });

/** The paper after J1.2 in the same session: J1.3 (490460). */
export const secondTalk = (): TalkSummary =>
  talkSummary({
    id: "490460",
    number: "J1.3",
    title: "Forays into using the Warn-On Forecast System to Predict Freezing Rain",
    startsAt: "2027-01-11T16:00:00.000Z",
    endsAt: "2027-01-11T16:15:00.000Z",
    presentingAuthor: "Daniel D. Tripp",
    authorLine:
      "Daniel D. Tripp, Cooperative Institute for Severe and High-Impact Weather Research and Operations (CIWRO), Norman, OK; and A. A. Rosenow, K. H. Knopfmeier, and N. Yussouf",
  });

export const days = (): Day[] =>
  ["2027-01-09", "2027-01-10", "2027-01-11", "2027-01-12"].map((date) => DaySchema.parse({ date, sessions: 10 }));

export const meeting = (over: Partial<Meeting> = {}): Meeting =>
  MeetingSchema.parse({
    name: "107th AMS Annual Meeting",
    startsOn: "2027-01-10",
    endsOn: "2027-01-14",
    timeZone: "America/Denver",
    venue: "Colorado Convention Center",
    city: "Denver, CO",
    about: "The American Meteorological Society's 107th Annual Meeting, in Denver and online.",
    ...over,
  });

export const talkDetail = (over: Partial<TalkDetail> = {}): TalkDetail =>
  TalkDetailSchema.parse({
    ...talkSummary(),
    abstract: "Snow squalls are short-fuse winter hazards with a quick onset of heavy snowfall.\n\nThis presentation looks at eight years of snow squall warnings.",
    affiliations: [],
    doi: "",
    citation:
      "Rosenow, A. A. (2027) What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us. [Abstract]. 107th AMS Annual Meeting, Denver, CO. https://studio.m-anage.com/ams/107ANNUAL/meetingapp.cgi/Paper/493803",
    trackIds: [],
    session: sessionSummary(),
    ...over,
  });

export const sessionDetail = (over: Partial<SessionDetail> = {}): SessionDetail =>
  SessionDetailSchema.parse({
    ...sessionSummary(),
    description: "",
    chairs: "CoChair: Kaitlyn Rose Jesmonth, SUNY Oswego, Albany, NY",
    tracks: [
      { id: "1968", code: "WAFNWP", title: "Fourth Symposium on the Future of Weather, Forecasting, and Practice" },
      { id: "1951", code: "R2O", title: "17th Conference on Transition of Research to Operations [17R2O]" },
    ],
    talks: [
      talkSummary(),
      secondTalk(),
    ],
    ...over,
  });

export const track = (over: Partial<Track> = {}): Track =>
  TrackSchema.parse({ id: "1968", code: "WAFNWP", title: "Fourth Symposium on the Future of Weather, Forecasting, and Practice", ...over });

export const trackDetail = (over: Partial<TrackDetail> = {}): TrackDetail =>
  TrackDetailSchema.parse({ ...track(), sessions: [sessionSummary()], ...over });

export const person = (over: Partial<Person> = {}): Person =>
  PersonSchema.parse({
    id: "gonzalo-gonzalez-abad",
    name: "Gonzalo Gonzalez Abad",
    affiliation: "Center for Astrophysics | Harvard & Smithsonian, Cambridge, MA",
    ...over,
  });

export const personDetail = (over: Partial<PersonDetail> = {}): PersonDetail =>
  PersonDetailSchema.parse({ ...person(), talks: [talkSummary()], ...over });

// ---- Organiser and developer consoles ----

export const organiserTalk = (over: Partial<OrganiserTalk> = {}): OrganiserTalk =>
  OrganiserTalkSchema.parse({
    ...talkSummary(),
    withdrawn: false,
    change: "none",
    sessionNumber: "J1",
    sessionTitle: sessionSummary().title,
    ...over,
  });

export const talkList = (talks: OrganiserTalk[] = [organiserTalk()], over: Partial<TalkList> = {}): TalkList =>
  TalkListSchema.parse({ talks, total: talks.length, page: 1, ...over });

export const organiserSession = (over: Partial<OrganiserSession> = {}): OrganiserSession =>
  OrganiserSessionSchema.parse({ ...sessionSummary(), talks: 6, changed: false, ...over });

export const sessionList = (sessions: OrganiserSession[] = [organiserSession()], over: Partial<SessionList> = {}): SessionList =>
  SessionListSchema.parse({ sessions, total: sessions.length, page: 1, ...over });

export const organiserSessionDetail = (over: Partial<OrganiserSessionDetail> = {}): OrganiserSessionDetail =>
  OrganiserSessionDetailSchema.parse({
    ...sessionSummary(),
    description: "",
    chairs: "",
    tracks: [],
    talks: [organiserTalk(), organiserTalk({ ...secondTalk(), withdrawn: true })],
    changed: false,
    ...over,
  });

export const syncRun = (over: Partial<SyncRun> = {}): SyncRun =>
  SyncRunSchema.parse({
    id: 3,
    state: "sent",
    startedAt: "2026-12-01T17:00:00.000Z",
    finishedAt: "2026-12-01T17:00:20.000Z",
    sent: 4522,
    added: 0,
    changed: 2,
    withdrawn: 1,
    unchanged: 4519,
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
