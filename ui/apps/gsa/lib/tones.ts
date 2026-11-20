export type Tone = "event" | "poster" | "joint" | "panel" | "break" | "oral";

/** The colour family for a session kind, matching the coloured edges on the Meeting Calendar. */
export function toneOf(kind: string): Tone {
  const k = kind.toLowerCase();
  if (k.includes("event") || k.includes("town hall")) return "event";
  if (k.includes("poster")) return "poster";
  if (k.includes("joint")) return "joint";
  if (k.includes("panel")) return "panel";
  if (k.includes("break")) return "break";
  return "oral";
}

export const TONE_CLASSES: Record<Tone, string> = {
  event: "border-l-tone-event bg-tone-event/10",
  poster: "border-l-tone-poster bg-tone-poster/10",
  joint: "border-l-tone-joint bg-tone-joint/10",
  panel: "border-l-tone-panel bg-tone-panel/10",
  break: "border-l-muted-foreground bg-muted",
  oral: "border-l-primary bg-primary/5",
};

/** The bold label before a session's title: its kind once, then its number if that adds something. Breaks and plain sessions carry no kind. */
export function cardLabel(kind: string, number: string): string {
  const shownKind = kind === "Session" || toneOf(kind) === "break" ? "" : kind;
  const shownNumber = number && number.toLowerCase() !== kind.toLowerCase() ? number : "";
  return [shownKind, shownNumber].filter(Boolean).join(" ");
}
