import { connect, createStore, createSyncLog } from "@repo/host-store";

import { CONFERENCE_IDS, conferenceApi } from "../matching-api";
import { readConfig } from "../server";
import { SendFailed, sendProgramme } from "../send";

const config = readConfig(process.env);
if (!config.api) {
  console.error("Set CONFERENCE_API_URL and CONFERENCE_API_KEY.");
  process.exit(1);
}
const { db, close } = connect(config.databaseUrl);
try {
  const api = conferenceApi({ url: config.api.url, key: config.api.key, conference: CONFERENCE_IDS[config.society] });
  const run = await sendProgramme({ store: createStore(db, config.society), log: createSyncLog(db, config.society), api });
  console.log(
    `${config.society}: sent ${run.sent} talks; added ${run.added}, changed ${run.changed}, withdrawn ${run.withdrawn}; ${run.programmeVersion}`,
  );
} catch (error) {
  if (!(error instanceof SendFailed)) throw error;
  console.error(`${config.society}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await close();
}
