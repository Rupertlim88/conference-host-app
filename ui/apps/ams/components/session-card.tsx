import type { SessionSummary } from "@repo/host-contracts";
import { MapPin } from "lucide-react";
import Link from "next/link";

import { placeOf } from "@/lib/place";
import { cardLabel, TONE_CLASSES, toneOf } from "@/lib/tones";
import { cn } from "@/lib/utils";

/** A session in a list, edged in its kind's colour, as on the Meeting Calendar. */
export function SessionCard({ session }: { session: SessionSummary }) {
  const label = cardLabel(session.kind, session.number);
  const place = placeOf(session.room, session.building);
  return (
    <Link
      href={`/sessions/${session.id}`}
      className={cn("block rounded-sm border border-l-4 px-3 py-2 text-sm hover:shadow-sm", TONE_CLASSES[toneOf(session.kind)])}
    >
      <p className="text-heading">
        {label && (
          <>
            <span className="mr-1 font-semibold">{label}</span>{" "}
          </>
        )}
        {session.title}
      </p>
      {place && (
        <p className="mt-1 flex items-center gap-1.5 text-muted-foreground italic">
          <MapPin className="size-3.5" aria-hidden />
          {place}
        </p>
      )}
    </Link>
  );
}
