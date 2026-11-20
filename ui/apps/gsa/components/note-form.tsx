"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Guidebook's note box for one session or abstract. It shows the saved note, says Saved after a save until the note is edited again, and says so when a save fails. */
export function NoteForm({ saved, saving, onSave }: { saved: string; saving: boolean; onSave: (body: string) => Promise<unknown> }) {
  const t = useTranslations("notes");
  const [draft, setDraft] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"saved" | "failed" | null>(null);
  const body = draft ?? saved;
  return (
    <section className="my-5">
      <label htmlFor="note" className="mb-1 block font-semibold">
        {t("label")}
      </label>
      <textarea
        id="note"
        value={body}
        maxLength={5000}
        rows={3}
        placeholder={t("placeholder")}
        onChange={(e) => {
          setDraft(e.target.value);
          setOutcome(null);
        }}
        className="w-full rounded-lg border p-2 text-sm"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            try {
              await onSave(body);
              setOutcome("saved");
            } catch {
              setOutcome("failed");
            }
          }}
        >
          {t("save")}
        </Button>
        {outcome === "saved" && (
          <span role="status" className="text-sm text-muted-foreground">
            {t("saved")}
          </span>
        )}
        {outcome === "failed" && (
          <span role="alert" className="text-sm text-destructive">
            {t("failed")}
          </span>
        )}
      </div>
    </section>
  );
}
