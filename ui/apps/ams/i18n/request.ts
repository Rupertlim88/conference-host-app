import { getRequestConfig } from "next-intl/server";

import { MEETING_ZONE } from "@/features/app";

// English only; meeting times default to Denver time.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../features/text/en.json")).default,
  timeZone: MEETING_ZONE,
}));
