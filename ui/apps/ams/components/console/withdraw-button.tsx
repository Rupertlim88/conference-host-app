"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

/** Withdraws a shown paper or restores a withdrawn one. It cannot be pressed while a change saves. */
export function WithdrawControl({
  withdrawn,
  busy,
  failed,
  onWithdraw,
  onRestore,
}: {
  withdrawn: boolean;
  busy: boolean;
  failed: boolean;
  onWithdraw: () => void;
  onRestore: () => void;
}) {
  const t = useTranslations("organiser.paper");
  const c = useTranslations("console");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant={withdrawn ? "default" : "destructive"} disabled={busy} onClick={withdrawn ? onRestore : onWithdraw}>
        {withdrawn ? t("restore") : t("withdraw")}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {c("failed")}
        </p>
      )}
    </div>
  );
}

/** The withdraw control, wired to the backend. The page reloads its data once the change is saved. */
export function WithdrawButton({ talkId, withdrawn }: { talkId: string; withdrawn: boolean }) {
  const router = useRouter();
  const done = { onSuccess: () => router.refresh() };
  const withdraw = trpc.organiser.talks.withdraw.useMutation(done);
  const restore = trpc.organiser.talks.restore.useMutation(done);
  return (
    <WithdrawControl
      withdrawn={withdrawn}
      busy={withdraw.isPending || restore.isPending}
      failed={withdraw.isError || restore.isError}
      onWithdraw={() => withdraw.mutate({ id: talkId })}
      onRestore={() => restore.mutate({ id: talkId })}
    />
  );
}
