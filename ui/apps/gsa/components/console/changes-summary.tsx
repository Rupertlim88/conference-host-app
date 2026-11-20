import type { Changes } from "@repo/host-contracts";
import { useTranslations } from "next-intl";

/** How the programme differs from the published one, counted. */
export function ChangesSummary({ changes }: { changes: Changes }) {
  const t = useTranslations("console.changes");
  const lines = (["moved", "rescheduled", "withdrawn", "sessions"] as const).filter((k) => changes[k] > 0);
  if (lines.length === 0) return <p className="text-sm">{t("none")}</p>;
  return (
    <ul className="list-disc pl-5 text-sm">
      {lines.map((k) => (
        <li key={k}>{t(k, { n: changes[k] })}</li>
      ))}
    </ul>
  );
}
