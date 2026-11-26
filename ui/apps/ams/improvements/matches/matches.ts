// The improvements matched around the attendee's own abstract share one answer from the matching API on each page.
import "server-only";

import { cache } from "react";

import { serverApi } from "@/shared/server";

/** The backend's view around the fixed abstract, asked once for each page's request however many improvements use it. */
export const aroundAbstract = cache(async () => (await serverApi()).improvements.aroundAbstract());
