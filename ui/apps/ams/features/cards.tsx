import type { SessionSummary, TalkSummary } from "@repo/host-contracts";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { When } from "@/features/meeting-time";
import { cn } from "@/features/ui/utils";

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

export type Tone = "event" | "poster" | "joint" | "panel" | "break" | "oral";

/** The colour family for a session kind, matching the coloured edges on the Meeting Calendar. */
export function toneOf(kind: string): Tone {
  const k = kind.toLowerCase();
  if (k.includes("event") || k.includes("town hall")) return "event";
  if (k.includes("poster")) return "poster";
  if (k.includes("joint")) return "joint";
  if (k.includes("panel")) return "panel";
  if (k.includes("break")) return "break";
  return "oral";
}

export const TONE_CLASSES: Record<Tone, string> = {
  event: "border-l-tone-event bg-tone-event/10",
  poster: "border-l-tone-poster bg-tone-poster/10",
  joint: "border-l-tone-joint bg-tone-joint/10",
  panel: "border-l-tone-panel bg-tone-panel/10",
  break: "border-l-muted-foreground bg-muted",
  oral: "border-l-primary bg-primary/5",
};

/** The bold label before a session's title: its kind, then its number. Breaks and plain sessions carry no kind. */
export function cardLabel(kind: string, number: string): string {
  const shownKind = kind === "Session" || toneOf(kind) === "break" ? "" : kind;
  return [shownKind, number].filter(Boolean).join(" ");
}

/** The day, time and place of a session or talk, as the meeting app shows them under the title. Lines with nothing
 *  to show are left out, and with nothing at all there is no box. */
export function InfoBox({ start, end, room, building }: { start: string | null; end: string | null; room: string; building: string }) {
  const t = useTranslations("info");
  const place = placeOf(room, building);
  if (!start && !place) return null;
  return (
    <dl className="my-4 divide-y rounded-md border bg-neutral-50 text-sm">
      {start && (
        <>
          <div className="flex items-center gap-2 px-3 py-2">
            <CalendarDays className="size-4 text-heading" aria-hidden />
            <dt className="sr-only">{t("day")}</dt>
            <dd>
              <When start={start} mode="day" />
            </dd>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <Clock className="size-4 text-heading" aria-hidden />
            <dt className="sr-only">{t("time")}</dt>
            <dd>
              <When start={start} end={end} mode="range" />
            </dd>
          </div>
        </>
      )}
      {place && (
        <div className="flex items-center gap-2 px-3 py-2 italic">
          <MapPin className="size-4 text-heading" aria-hidden />
          <dt className="sr-only">{t("place")}</dt>
          <dd>{place}</dd>
        </div>
      )}
    </dl>
  );
}

/** Where something happens, as the programme prints it: "403 (Colorado Convention Center)". No room means no place. */
export function placeOf(room: string, building: string): string {
  if (!room) return "";
  return building ? `${room} (${building})` : room;
}
