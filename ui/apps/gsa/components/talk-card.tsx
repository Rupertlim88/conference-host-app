import type { TalkSummary } from "@repo/host-contracts";
import { Clock, MapPin } from "lucide-react";
import Link from "next/link";

import { placeOf } from "@/lib/place";

import { When } from "./when";

/** A talk in a list: its time, number and title, authors and place. A break is listed but leads nowhere. */
export function TalkCard({ talk }: { talk: TalkSummary }) {
  const place = placeOf(talk.room, talk.building);
  const body = (
    <>
      {talk.startsAt && (
        <p className="mb-1 inline-flex items-center gap-1.5 rounded border bg-white px-2 py-0.5 text-xs">
          <Clock className="size-3.5" aria-hidden />
          <When start={talk.startsAt} mode="time" />
        </p>
      )}
      <p className="text-primary">
        {talk.number && (
          <>
            <span className="font-semibold">{talk.number}</span>{" "}
          </>
        )}
        {talk.title}
      </p>
      {talk.authorLine && <p className="mt-1 text-xs text-muted-foreground italic">{talk.authorLine}</p>}
      {place && (
        <p className="mt-1 flex items-center gap-1.5 text-xs italic">
          <MapPin className="size-3.5" aria-hidden />
          {place}
        </p>
      )}
    </>
  );
  if (talk.kind === "break") return <div className="rounded-md border bg-muted px-3 py-2 text-sm">{body}</div>;
  return (
    <Link href={`/talks/${talk.id}`} className="block rounded-md border px-3 py-2 text-sm hover:shadow-sm">
      {body}
    </Link>
  );
}
