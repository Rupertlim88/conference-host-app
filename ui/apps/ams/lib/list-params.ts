import { TalkStatusFilterSchema, type TalkStatusFilter } from "@repo/host-contracts";
import { z } from "zod";

import { firstParam } from "./params";

type Param = string | string[] | undefined;

const Page = z.coerce.number().int().min(1).max(10_000).catch(1);

/** A console list's search, status filter and page from the address. Each bad value falls back on its own, so a
 *  hand-edited address still shows a list. */
export function listParams(sp: { q?: Param; status?: Param; page?: Param }): { q: string; status: TalkStatusFilter; page: number } {
  return {
    q: firstParam(sp.q).trim().slice(0, 100),
    status: TalkStatusFilterSchema.catch("all").parse(firstParam(sp.status)),
    page: Page.parse(firstParam(sp.page) || 1),
  };
}
