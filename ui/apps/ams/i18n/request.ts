import { getRequestConfig } from "next-intl/server";

import { MEETING_ZONE } from "@/lib/meeting";

// English only; meeting times default to Denver time.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../messages/en.json")).default,
  timeZone: MEETING_ZONE,
}));
