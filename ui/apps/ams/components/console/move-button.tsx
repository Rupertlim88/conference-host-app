"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

/** Moves a paper into the named session. */
export function MoveControl({ number, busy, failed, onMove }: { number: string; busy: boolean; failed: boolean; onMove: () => void }) {
  const t = useTranslations("organiser.paper");
  const c = useTranslations("console");
  return (
    <span className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onMove}>
        {t("moveTo", { number })}
      </Button>
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          {c("failed")}
        </span>
      )}
    </span>
  );
}

/** The move control, wired to the backend. Once moved, the paper's page shows it in its new session. */
export function MoveButton({ talkId, session }: { talkId: string; session: { id: string; number: string } }) {
  const router = useRouter();
  const move = trpc.organiser.talks.move.useMutation({
    onSuccess: () => {
      router.replace(`/organiser/talks/${talkId}`);
      router.refresh();
    },
  });
  return (
    <MoveControl
      number={session.number}
      busy={move.isPending}
      failed={move.isError}
      onMove={() => move.mutate({ id: talkId, sessionId: session.id })}
    />
  );
}
