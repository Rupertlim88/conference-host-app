import type { Track } from "@repo/host-contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PageTitle } from "@/components/page-title";

/** Every conference and symposium of the meeting, each leading to its programme. */
export function ProgramsView({ tracks }: { tracks: Track[] }) {
  const t = useTranslations("programs");
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <ul className="divide-y rounded-md border">
        {tracks.map((track) => (
          <li key={track.id}>
            <Link href={`/programs/${track.id}`} className="block px-4 py-3 text-sm text-primary hover:bg-primary/5">
              {track.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
