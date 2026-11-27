// A test set is checked, stored, held and sent to the matching API.
import { TestSetReplySchema, TestSetSchema, type TestSet } from "@repo/host-contracts";
import type { SyncLog, TestSets, WholeProgramme, WholeProgrammeStore } from "@repo/host-store";

import type { ConferenceApi } from "./matching-api";
import { SendFailed, SendRunning, sendProgramme, type SyncTalk } from "./send";
import { plain } from "./tester-token";

export interface TestSetDeps {
  /** The conference id this host app's programme is filed under at the matching API. */
  conference: string;
  whole: Pick<WholeProgrammeStore, "contents">;
  testSets: Pick<TestSets, "hold">;
  store: { talksForSync(): Promise<SyncTalk[]> };
  log: SyncLog;
  api: ConferenceApi;
}

/** At most this many ids are named in a refusal. */
const NAMED = 10;
const listed = (ids: string[]) => ids.slice(0, NAMED).join(", ") + (ids.length > NAMED ? ` and ${ids.length - NAMED} more` : "");

/** Why the test set cannot be taken, checked against AMS's whole published programme, or null when it can. */
function refusal(testSet: TestSet, talks: Map<string, { hasAbstract: boolean }>, whole: WholeProgramme, conference: string): string | null {
  if (testSet.conference !== conference) return `This host app holds ${conference}, not ${testSet.conference}.`;
  const unknown = testSet.talks.filter((id) => !talks.has(id));
  if (unknown.length) return `Not talks of AMS's published programme: ${listed(unknown)}.`;
  const inSet = new Set(testSet.talks);
  const outside = testSet.askers.filter((id) => !inSet.has(id));
  if (outside.length) return `Every abstract to test must be among the talks; these are not: ${listed(outside)}.`;
  const blank = testSet.askers.filter((id) => !talks.get(id)!.hasAbstract);
  if (blank.length) return `These abstracts to test have no abstract, so the matching API cannot match them: ${listed(blank)}.`;
  if (!testSet.layout) return null;
  const sessions = new Set(whole.sessions.map((s) => s.id));
  const unknownSessions = testSet.layout.sessions.map((s) => s.id).filter((id) => !sessions.has(id));
  if (unknownSessions.length) return `The layout names sessions AMS's published programme does not have: ${listed(unknownSessions)}.`;
  const tracks = new Set(whole.tracks.map((t) => t.id));
  const unknownTracks = testSet.layout.conferences.map((c) => c.trackId).filter((id) => !tracks.has(id));
  if (unknownTracks.length) return `The layout names conferences AMS's published programme does not have: ${listed(unknownTracks)}.`;
  return null;
}

/** Checks a test set, stores it and holds its talks in one step, then sends the programme as the organiser console's
 *  Send programme does. 202 with the programme version the send returned; 400 for a test set that cannot be taken;
 *  409 while another send runs, and 502 when the send fails, the test set held either way; 503 before the whole
 *  programme is loaded. */
export async function takeTestSet(req: Request, deps: TestSetDeps): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return plain(400, "The test set must be JSON.");
  }
  const parsed = TestSetSchema.safeParse(body);
  if (!parsed.success) {
    const problems = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    return plain(400, `The test set does not fit its form: ${problems.join("; ")}.`);
  }
  const testSet = parsed.data;

  const whole = await deps.whole.contents();
  const { talks } = whole;
  if (talks.length === 0) return plain(503, "AMS's whole published programme is not loaded yet: run the load command.");
  const published = new Map(talks.filter((t) => t.kind !== "break").map((t) => [t.id, t]));
  const refused = refusal(testSet, published, whole, deps.conference);
  if (refused) return plain(400, refused);

  await deps.testSets.hold(testSet);
  try {
    const run = await sendProgramme({ store: deps.store, log: deps.log, api: deps.api });
    return Response.json(TestSetReplySchema.parse({ sentProgrammeVersion: run.programmeVersion }), { status: 202 });
  } catch (error) {
    if (error instanceof SendRunning) return plain(409, "The test set is held, but a send is already running: post it again when that send has finished.");
    if (error instanceof SendFailed) return plain(502, `The test set is held, but the send failed: ${error.run.error}`);
    throw error;
  }
}
