"use client";

// Times show in meeting time or the guest's own zone, and the guest's choice is remembered.

import { type DateTimeFormatOptions, useFormatter, useTranslations } from "next-intl";
import { createContext, useContext, useSyncExternalStore } from "react";

import { MEETING_ZONE } from "@/shared/app";
import { Button } from "@/shared/ui/button";

// The guest's choice lives in localStorage. useSyncExternalStore reads it, so the server render and the first client render agree on meeting time.
const KEY = "isobar-local-time";
const listeners = new Set<() => void>();
// The choice for this page once the browser has refused to store it; null while storage holds the choice.
let pageChoice: boolean | null = null;

function readLocal(): boolean {
  if (pageChoice !== null) return pageChoice;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function writeLocal(local: boolean): void {
  try {
    if (local) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
    pageChoice = null;
  } catch {
    pageChoice = local;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const ZoneContext = createContext({ zone: MEETING_ZONE, local: false, toggle: () => {} });

export function TimeZoneProvider({ children }: { children: React.ReactNode }) {
  const local = useSyncExternalStore(subscribe, readLocal, () => false);
  const zone = local ? Intl.DateTimeFormat().resolvedOptions().timeZone : MEETING_ZONE;
  return <ZoneContext value={{ zone, local, toggle: () => writeLocal(!local) }}>{children}</ZoneContext>;
}

/** The zone times show in: the meeting's, or the device's when the guest chose it. */
export const useZone = () => useContext(ZoneContext).zone;

export function TimeZoneSwitch() {
  const t = useTranslations("time");
  const { local, toggle } = useContext(ZoneContext);
  const [shown, other] = local ? [t("local"), t("meeting")] : [t("meeting"), t("local")];
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-label={t("switchTo", { zone: other })}
      className="h-7 rounded-md bg-neutral-800 px-2 text-xs font-semibold text-white hover:bg-neutral-700 hover:text-white"
    >
      {shown}
    </Button>
  );
}

const FORMATS = {
  day: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  date: { weekday: "short", month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit" },
} satisfies Record<string, DateTimeFormatOptions>;

/** A meeting time in the chosen zone. day: "Monday, January 11, 2027"; date: "Mon, Jan 11"; time: "8:45 AM"; range: "8:45 AM - 9:00 AM". */
export function When({ start, end, mode }: { start: string | null; end?: string | null; mode: "date" | "time" | "range" | "day" }) {
  const format = useFormatter();
  const timeZone = useZone();
  if (!start) return null;
  const at = (iso: string, style: keyof typeof FORMATS) => format.dateTime(new Date(iso), { ...FORMATS[style], timeZone });
  const text = mode !== "range" ? at(start, mode) : end ? `${at(start, "time")} - ${at(end, "time")}` : at(start, "time");
  return <>{text}</>;
}
