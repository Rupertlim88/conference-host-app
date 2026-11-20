import type { SessionKind } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";

/** Filter by Session Type: every session type with its count, each leading to its sessions. */
export function TypesView({ kinds }: { kinds: SessionKind[] }) {
  const t = useTranslations("filters");
  return (
    <>
      <PageTitle>{t("sessionTypes")}</PageTitle>
      <ul className="divide-y rounded-xl border">
        {kinds.map((k) => (
          <li key={k.kind}>
            <Link href={`/types/${encodeURIComponent(k.kind)}`} className="flex justify-between px-4 py-3 text-[15px] hover:bg-primary/5">
              {k.kind}{" "}
              <span className="text-muted-foreground">{k.sessions}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
