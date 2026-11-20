"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { toIcs } from "@/lib/ics";

/** Downloads an .ics file, the calendar sync Guidebook offers. An item with no time has nothing to add. */
export function AddToCalendar({ id, title, start, end, location }: { id: string; title: string; start: string | null; end: string | null; location: string }) {
  const t = useTranslations("ics");
  if (!start) return null;
  const download = () => {
    const ics = toIcs({ uid: `${id}@strata-demo`, title, start, end, location });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    Object.assign(document.createElement("a"), { href: url, download: `${id}.ics` }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" onClick={download}>
      <CalendarPlus className="size-4" aria-hidden />
      {t("add")}
    </Button>
  );
}
