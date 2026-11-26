// Our improvements list their changes, each at a change point in the base.
import { serverApi } from "@/shared/server";
import { ProgrammeOrderView } from "@/improvements/programme-order";
import { RelatedTalks } from "@/improvements/related-talks";
import type { Changes } from "@/versions/change";

/** After a talk's abstract, its related talks; in place of the conferences list, the list ordered around the abstract. */
export const changes: Changes = {
  "talk.afterAbstract": {
    label: "relatedTalks",
    render: ({ talkId }) => <RelatedTalks talkId={talkId} />,
  },
  "programmes.list": {
    label: "programmeOrder",
    render: async ({ tracks }) => <ProgrammeOrderView tracks={tracks} around={await (await serverApi()).improvements.aroundAbstract()} />,
  },
};
