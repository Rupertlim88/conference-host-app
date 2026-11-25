import { connect, createProgramme, createSyncLog } from "@repo/host-store";

import { CONFERENCE_IDS, conferenceApi, unconfiguredApi } from "../matching-api";
import { readConfig } from "../server";
import { SendFailed, SendRunning, sendProgramme } from "../send";

// npm run sync --workspace=@repo/host-backend: sends the programme as the organiser console's Send does, and records
// the run in the same log, failed runs included.
const config = readConfig(process.env);
const { db, close } = connect(config.databaseUrl);
try {
  const api = config.api
    ? conferenceApi({ url: config.api.url, key: config.api.key, conference: CONFERENCE_IDS[config.society] })
    : unconfiguredApi;
  const run = await sendProgramme({ store: createProgramme(db, config.society), log: createSyncLog(db, config.society), api });
  console.log(
    `${config.society}: sent ${run.sent} talks; added ${run.added}, changed ${run.changed}, withdrawn ${run.withdrawn}, unchanged ${run.unchanged}; ${run.programmeVersion}`,
  );
} catch (error) {
  if (!(error instanceof SendFailed) && !(error instanceof SendRunning)) throw error;
  console.error(`${config.society}: ${error instanceof SendFailed ? error.run.error : error.message}`);
  process.exitCode = 1;
} finally {
  await close();
}
