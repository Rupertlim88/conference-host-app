"use client";

import type { SyncRun } from "@repo/host-contracts";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export type SendProblem = "running" | "error";

/** A send button that asks to confirm first, then says what the send did. */
export function SendControl({
  label,
  busy,
  result,
  problem,
  onSend,
}: {
  label: string;
  busy: boolean;
  result: SyncRun | null;
  problem: SendProblem | null;
  onSend: () => void;
}) {
  const t = useTranslations("console.send");
  const c = useTranslations("console");
  const format = useFormatter();
  const [confirming, setConfirming] = useState(false);
  const n = (x: number) => format.number(x);
  return (
    <div className="space-y-2">
      <Button type="button" disabled={busy || confirming} onClick={() => setConfirming(true)}>
        {label}
      </Button>
      {confirming && (
        <div className="flex flex-wrap items-center gap-3 rounded border bg-white p-3 text-sm">
          <p>{t("confirm")}</p>
          <Button
            type="button"
            onClick={() => {
              setConfirming(false);
              onSend();
            }}
          >
            {t("now")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
            {c("cancel")}
          </Button>
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm">
          {t("sending")}
        </p>
      )}
      {!busy && result?.state === "sent" && (
        <p role="status" className="text-sm text-green-800">
          {t("sent", { sent: n(result.sent), added: n(result.added), changed: n(result.changed), withdrawn: n(result.withdrawn) })}
        </p>
      )}
      {!busy && result?.state === "failed" && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed", { error: result.error })}
        </p>
      )}
      {!busy && result?.state === "interrupted" && (
        <p role="alert" className="text-sm text-destructive">
          {t("interrupted")}
        </p>
      )}
      {!busy && problem && (
        <p role="alert" className="text-sm text-destructive">
          {t(problem)}
        </p>
      )}
    </div>
  );
}

/** Sends the programme through the backend, and reloads the page so the runs and changes show the send. */
export function useSend() {
  const router = useRouter();
  const send = trpc.organiser.programme.send.useMutation({ onSettled: () => router.refresh() });
  const problem: SendProblem | null = send.isError ? (send.error.data?.code === "CONFLICT" ? "running" : "error") : null;
  return { busy: send.isPending, result: send.data ?? null, problem, onSend: () => send.mutate() };
}

/** The send control on the send page. */
export function SendPanel({ label }: { label: string }) {
  return <SendControl label={label} {...useSend()} />;
}
