"use client";

import type { ConnectionTest, ResetResult, SyncRun } from "@repo/host-contracts";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

import { SendControl, useSend, type SendProblem } from "./send-panel";

function connectionText(t: ReturnType<typeof useTranslations<"developer.result">>, r: ConnectionTest): string {
  const status = String(r.httpStatus ?? "");
  switch (r.status) {
    case "ok":
      return t("ok", { status, ms: String(r.ms ?? 0) });
    case "not-set":
      return t("notSet");
    case "refused-key":
      return t("refusedKey", { status });
    case "no-programme":
      return r.httpStatus === null ? t("noTalks") : t("noProgramme", { status });
    case "unreachable":
      return t("unreachable");
    case "unexpected-answer":
      return t("unexpected", { status });
  }
}

/** The developer console's actions: test the connection, send again, and reset to the published programme. */
export function DeveloperControls({
  test,
  send,
  reset,
  onTest,
  onSend,
  onReset,
}: {
  test: { busy: boolean; failed: boolean; result: ConnectionTest | null };
  send: { busy: boolean; result: SyncRun | null; problem: SendProblem | null };
  reset: { busy: boolean; failed: boolean; result: ResetResult | null };
  onTest: () => void;
  onSend: () => void;
  onReset: () => void;
}) {
  const t = useTranslations("developer");
  const result = useTranslations("developer.result");
  const c = useTranslations("console");
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Button type="button" variant="outline" disabled={test.busy} onClick={onTest}>
          {t("test")}
        </Button>
        {test.busy && <p className="text-sm">{t("testing")}</p>}
        {!test.busy && test.result && (
          <p role="status" className="text-sm">
            {connectionText(result, test.result)}
          </p>
        )}
        {!test.busy && test.failed && (
          <p role="alert" className="text-sm text-destructive">
            {c("failed")}
          </p>
        )}
      </section>
      <section>
        <SendControl label={t("sendAgain")} {...send} onSend={onSend} />
      </section>
      <section className="space-y-2">
        <Button type="button" variant="destructive" disabled={reset.busy || confirmReset} onClick={() => setConfirmReset(true)}>
          {t("reset")}
        </Button>
        {confirmReset && (
          <div className="flex flex-wrap items-center gap-3 rounded border bg-white p-3 text-sm">
            <p>{t("resetConfirm")}</p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmReset(false);
                onReset();
              }}
            >
              {t("resetNow")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmReset(false)}>
              {c("cancel")}
            </Button>
          </div>
        )}
        {reset.busy && <p className="text-sm">{t("resetting")}</p>}
        {!reset.busy && reset.result && (
          <p role="status" className="text-sm text-green-800">
            {t("resetDone", reset.result)}
          </p>
        )}
        {!reset.busy && reset.failed && (
          <p role="alert" className="text-sm text-destructive">
            {c("failed")}
          </p>
        )}
      </section>
    </div>
  );
}

/** The developer controls, wired to the backend. A send or reset reloads the page so the status shows it. */
export function DeveloperActions() {
  const router = useRouter();
  const test = trpc.developer.testConnection.useMutation();
  const reset = trpc.developer.reset.useMutation({ onSuccess: () => router.refresh() });
  const send = useSend();
  return (
    <DeveloperControls
      test={{ busy: test.isPending, failed: test.isError, result: test.data ?? null }}
      send={send}
      reset={{ busy: reset.isPending, failed: reset.isError, result: reset.data ?? null }}
      onTest={() => test.mutate()}
      onSend={send.onSend}
      onReset={() => reset.mutate()}
    />
  );
}
