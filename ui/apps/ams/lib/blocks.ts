import type { SessionSummary } from "@repo/host-contracts";

export interface TimeBlock {
  startsAt: string;
  endsAt: string | null;
  sessions: SessionSummary[];
}

/** A day's sessions grouped by shared start and end time, earliest first, as the Meeting Calendar shows them. */
export function timeBlocks(sessions: SessionSummary[]): TimeBlock[] {
  const blocks = new Map<string, TimeBlock>();
  for (const s of sessions) {
    if (!s.startsAt) continue;
    const key = `${s.startsAt}|${s.endsAt ?? ""}`;
    const block = blocks.get(key) ?? { startsAt: s.startsAt, endsAt: s.endsAt, sessions: [] };
    block.sessions.push(s);
    blocks.set(key, block);
  }
  return [...blocks.values()].sort(
    (a, b) => a.startsAt.localeCompare(b.startsAt) || (a.endsAt ?? "").localeCompare(b.endsAt ?? ""),
  );
}
