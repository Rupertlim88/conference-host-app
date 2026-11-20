"use client";

import type { Target } from "@repo/host-contracts";

import { trpc } from "@/lib/trpc";

import { NoteForm } from "./note-form";

/** The note box, wired to the backend. Saving refreshes this note and the Notes page. */
export function NoteEditor({ target }: { target: Target }) {
  const utils = trpc.useUtils();
  const note = trpc.notes.get.useQuery(target);
  const save = trpc.notes.save.useMutation({
    onSuccess: () => Promise.all([utils.notes.get.invalidate(target), utils.notes.list.invalidate()]),
  });
  return <NoteForm saved={note.data?.body ?? ""} saving={save.isPending} onSave={(body) => save.mutateAsync({ ...target, body })} />;
}
