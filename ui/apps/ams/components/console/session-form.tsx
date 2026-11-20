"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export interface SessionTimes {
  date: string;
  start: string;
  end: string;
  room: string;
}

const PROBLEM = {
  "incomplete-time": "incompleteTime",
  "end-before-start": "endBeforeStart",
  "outside-meeting": "outsideMeeting",
} as const;
type Problem = keyof typeof PROBLEM;
const isProblem = (message: string | undefined): message is Problem => message !== undefined && message in PROBLEM;

export type SaveOutcome = "saved" | Problem | "failed";

/** A session's date, times in meeting time, and room, with Save session. Empty times leave the session with no
 *  time, or with no end. Says it saved, or why it did not. */
export function SessionFormFields({
  initial,
  busy,
  outcome,
  onSave,
}: {
  initial: SessionTimes;
  busy: boolean;
  outcome: SaveOutcome | null;
  onSave: (times: SessionTimes) => void;
}) {
  const t = useTranslations("organiser.session");
  const c = useTranslations("console");
  const [times, setTimes] = useState(initial);
  const field = (name: keyof SessionTimes, label: string, type: string) => (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <Input type={type} value={times[name]} onChange={(e) => setTimes({ ...times, [name]: e.target.value })} />
    </label>
  );
  return (
    <form
      className="grid max-w-xl gap-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(times);
      }}
    >
      {field("date", t("date"), "date")}
      {field("start", t("start"), "time")}
      {field("end", t("end"), "time")}
      {field("room", t("room"), "text")}
      <div className="flex items-center gap-3 sm:col-span-4">
        <Button type="submit" disabled={busy}>
          {t("save")}
        </Button>
        {outcome === "saved" && (
          <p role="status" className="text-sm text-green-800">
            {t("saved")}
          </p>
        )}
        {outcome !== null && outcome !== "saved" && (
          <p role="alert" className="text-sm text-destructive">
            {outcome === "failed" ? c("failed") : t(PROBLEM[outcome])}
          </p>
        )}
      </div>
    </form>
  );
}

/** The session form, wired to the backend. A refused change names its problem; a saved one reloads the page. */
export function SessionForm({ sessionId, initial }: { sessionId: string; initial: SessionTimes }) {
  const router = useRouter();
  const change = trpc.organiser.sessions.change.useMutation({ onSuccess: () => router.refresh() });
  const problem = change.error?.message;
  const outcome: SaveOutcome | null = change.isSuccess ? "saved" : change.isError ? (isProblem(problem) ? problem : "failed") : null;
  return (
    <SessionFormFields
      initial={initial}
      busy={change.isPending}
      outcome={outcome}
      onSave={(times) => change.mutate({ id: sessionId, ...times })}
    />
  );
}
