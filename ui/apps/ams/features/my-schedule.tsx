"use client";

import type { Schedule, Target } from "@repo/host-contracts";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { SessionCard, TalkCard } from "@/features/cards";
import { trpc } from "@/features/connection";
import { PageTitle } from "@/features/frame";
import { cn } from "@/features/ui/utils";

/** The star, wired to the backend. Starring refreshes both the star list and My Schedule. */
export function StarButton({ target }: { target: Target }) {
  const utils = trpc.useUtils();
  const starred = trpc.schedule.starred.useQuery();
  const done = () => Promise.all([utils.schedule.starred.invalidate(), utils.schedule.get.invalidate()]);
  const star = trpc.schedule.star.useMutation({ onSuccess: done });
  const unstar = trpc.schedule.unstar.useMutation({ onSuccess: done });
  return (
    <StarToggle
      target={target}
      starred={starred.data}
      busy={star.isPending || unstar.isPending}
      onStar={(t) => star.mutate(t)}
      onUnstar={(t) => unstar.mutate(t)}
    />
  );
}

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

/** The guest's starred sessions, then starred presentations; with none, how to add some. */
export function ScheduleView({ schedule }: { schedule: Schedule }) {
  const t = useTranslations("schedule");
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      {schedule.talks.length + schedule.sessions.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
      {schedule.sessions.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("sessions")}</h2>
          <div className="space-y-2">
            {schedule.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}
      {schedule.talks.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-heading">{t("talks")}</h2>
          <div className="space-y-2">
            {schedule.talks.map((talk) => (
              <TalkCard key={talk.id} talk={talk} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
