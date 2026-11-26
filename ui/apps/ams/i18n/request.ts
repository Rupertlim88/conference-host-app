import { getRequestConfig } from "next-intl/server";

import { MEETING_ZONE } from "@/shared/app";

// English only; meeting times default to Denver time.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../shared/text/en.json")).default,
  timeZone: MEETING_ZONE,
}));
