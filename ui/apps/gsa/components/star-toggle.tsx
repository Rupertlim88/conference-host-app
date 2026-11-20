"use client";

import type { Target } from "@repo/host-contracts";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** The star on a talk or session. It shows the saved state and cannot be pressed while the stars load or a change saves. */
export function StarToggle({
  target,
  starred,
  busy,
  onStar,
  onUnstar,
}: {
  target: Target;
  starred: Target[] | undefined;
  busy: boolean;
  onStar: (target: Target) => void;
  onUnstar: (target: Target) => void;
}) {
  const t = useTranslations("star");
  const on = starred?.some((s) => s.targetKind === target.targetKind && s.targetId === target.targetId) ?? false;
  const label = on ? t("remove") : t("add");
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      disabled={busy || starred === undefined}
      onClick={() => (on ? onUnstar(target) : onStar(target))}
      className="text-heading disabled:opacity-50"
    >
      <Star className={cn("size-6", on && "fill-tone-event text-tone-event")} aria-hidden />
    </button>
  );
}
