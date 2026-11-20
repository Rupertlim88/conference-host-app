import { CalendarDays, Clock, MapPin } from "lucide-react";

import { placeOf } from "@/lib/place";

import { When } from "./when";

/** The day, time and place of a session or talk, as the meeting app shows them under the title. */
export function InfoBox({ start, end, room, building }: { start: string | null; end: string | null; room: string; building: string }) {
  const place = placeOf(room, building);
  return (
    <dl className="my-4 divide-y rounded-md border bg-neutral-50 text-sm">
      {start && (
        <>
          <div className="flex items-center gap-2 px-3 py-2">
            <CalendarDays className="size-4 text-heading" aria-hidden />
            <dd>
              <When start={start} mode="day" />
            </dd>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <Clock className="size-4 text-heading" aria-hidden />
            <dd>
              <When start={start} end={end} mode="range" />
            </dd>
          </div>
        </>
      )}
      {place && (
        <div className="flex items-center gap-2 px-3 py-2 italic">
          <MapPin className="size-4 text-heading" aria-hidden />
          <dd>{place}</dd>
        </div>
      )}
    </dl>
  );
}
