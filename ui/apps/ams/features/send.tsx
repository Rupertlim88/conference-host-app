"use client";

// Organisers send the programme to the matching API, after confirming, and see the last ten sends.

import type { Changes, SyncRun } from "@repo/host-contracts";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/features/connection";
import { Cell, ChangesSummary, ConsoleTime, Table } from "@/features/console-frame";
import { PageTitle } from "@/features/frame";
import { Button } from "@/features/ui/button";

/** The send page: what changed since the published programme, the send control, and the last ten sends. */
export function SendView({ changes, runs, send }: { changes: Changes; runs: SyncRun[]; send: React.ReactNode }) {
  const t = useTranslations("organiser.sendPage");
  const c = useTranslations("console");
  const format = useFormatter();
  return (
    <>
      <PageTitle>{useTranslations("organiser")("send")}</PageTitle>
      <p className="mb-4 max-w-2xl text-sm">{t("intro")}</p>
      <section className="mb-4">
        <h2 className="mb-2 text-lg font-semibold text-heading">{c("changes.title")}</h2>
        <ChangesSummary changes={changes} />
      </section>
      <div className="mb-6">{send}</div>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-heading">{t("runs")}</h2>
        {runs.length === 0 ? (
          <p className="text-sm">{t("noRuns")}</p>
        ) : (
          <Table
            head={[t("column.started"), t("column.result"), t("column.sent"), t("column.added"), t("column.changed"), t("column.withdrawn"), t("column.note")]}
          >
            {runs.map((run) => (
              <tr key={run.id}>
                <Cell className="whitespace-nowrap">
                  <ConsoleTime start={run.startedAt} />
                </Cell>
                <Cell>{c(`runState.${run.state}`)}</Cell>
                <Cell>{format.number(run.sent)}</Cell>
                <Cell>{format.number(run.added)}</Cell>
                <Cell>{format.number(run.changed)}</Cell>
                <Cell>{format.number(run.withdrawn)}</Cell>
                <Cell>{run.error}</Cell>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}

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
