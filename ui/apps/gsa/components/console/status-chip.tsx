import type { TalkChange } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const STYLE = {
  scheduled: "border-emerald-300 bg-emerald-50 text-emerald-900",
  withdrawn: "border-red-300 bg-red-50 text-red-800",
  moved: "border-amber-300 bg-amber-50 text-amber-900",
  rescheduled: "border-sky-300 bg-sky-50 text-sky-900",
  published: "border-neutral-300 text-neutral-700",
  changed: "border-amber-300 bg-amber-50 text-amber-900",
} as const;

function Chip({ kind }: { kind: keyof typeof STYLE }) {
  const t = useTranslations("console.status");
  return <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold", STYLE[kind])}>{t(kind)}</span>;
}

/** A submission's status: withdrawn, or how it differs from the published programme. */
export function SubmissionStatus({ withdrawn, change }: { withdrawn: boolean; change: TalkChange }) {
  return <Chip kind={withdrawn ? "withdrawn" : change === "none" ? "scheduled" : change} />;
}

/** A session's status: as published, or changed. */
export function SessionStatus({ changed }: { changed: boolean }) {
  return <Chip kind={changed ? "changed" : "published"} />;
}
