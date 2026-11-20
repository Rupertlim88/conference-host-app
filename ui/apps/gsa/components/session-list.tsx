import type { SessionSummary } from "@repo/host-contracts";
import Link from "next/link";

import { When } from "./when";

/** Guidebook's list rows: times on the left, number and title in bold, kind and room underneath. */
export function SessionList({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <ul className="divide-y rounded-xl border">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link href={`/sessions/${s.id}`} className="flex gap-3 px-3 py-3 hover:bg-primary/5">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              <When start={s.startsAt} mode="time" />
              {s.endsAt && (
                <>
                  {" "}
                  <br />
                  <When start={s.endsAt} mode="time" />
                </>
              )}
            </span>{" "}
            <span className="min-w-0">
              <span className="block font-semibold">
                {s.number && `${s.number}: `}
                {s.title}
              </span>{" "}
              <span className="block text-sm text-muted-foreground">{[s.kind, s.room].filter(Boolean).join(" · ")}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
