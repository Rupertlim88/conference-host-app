import type { Note } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";

/** The guest's notes, each under what it is on and leading back there. */
export function NotesView({ notes }: { notes: Note[] }) {
  const t = useTranslations("notes");
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      {notes.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={`${n.targetKind}-${n.targetId}`}>
            <Link href={`/${n.targetKind === "talk" ? "talks" : "sessions"}/${n.targetId}`} className="block rounded-xl border p-3 hover:shadow-sm">
              <span className="block font-semibold text-primary">{n.title}</span>{" "}
              <span className="mt-1 block text-sm whitespace-pre-line">{n.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
