import type { Db } from "../src/connect";
import { createGuestData } from "../src/guest-data";
import { createProgramme } from "../src/programme";

/** The programme reads and the guest's own data together, as the backend joins them. */
export const createStore = (db: Db, society: "ams") => ({ ...createProgramme(db, society), ...createGuestData(db, society) });
