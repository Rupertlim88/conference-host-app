"use client";

import { useTranslations } from "next-intl";
import { createContext, useContext, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { MEETING_ZONE } from "@/lib/meeting";

// The guest's choice lives in localStorage. useSyncExternalStore reads it, so the server render and the first client render agree on meeting time.
const KEY = "isobar-local-time";
const listeners = new Set<() => void>();
// The choice for this page when the browser refuses storage.
let unstored = false;

function readLocal(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return unstored;
  }
}

function writeLocal(local: boolean): void {
  try {
    if (local) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    unstored = local;
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
