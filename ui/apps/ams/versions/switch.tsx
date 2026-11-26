"use client";

// A button on the screen, and pressing Control on its own, switch between the base and our versions.

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { nextVersion, VERSION_COOKIE, type VersionId } from "@/versions/versions";

const YEAR = 60 * 60 * 24 * 365;

/** The demo's own bar, not AMS's: the version shown, the button to the next one, and the two consoles. */
export function VersionSwitch({ current }: { current: VersionId }) {
  const t = useTranslations("versions");
  const nav = useTranslations("nav");
  const router = useRouter();
  const next = nextVersion(current);
  const go = useCallback(() => {
    document.cookie = `${VERSION_COOKIE}=${next}; path=/; max-age=${YEAR}; samesite=lax`;
    router.refresh();
  }, [next, router]);

  useEffect(() => {
    // Control pressed and released with no other key in between.
    let alone = false;
    const down = (e: KeyboardEvent) => {
      alone = e.key === "Control" && !e.repeat ? true : e.key === "Control" ? alone : false;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Control" && alone) go();
      alone = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [go]);

  return (
    <aside
      aria-label={t("bar")}
      className="fixed right-3 bottom-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border-2 border-amber-400 bg-white px-3 py-2 text-xs shadow-lg"
    >
      <span className="font-semibold">{t("showing", { name: t(current) })}</span>
      <button
        type="button"
        onClick={go}
        className="rounded bg-amber-400 px-2 py-1 font-semibold text-amber-950 hover:bg-amber-300"
      >
        {t("switchTo", { name: t(next) })}
      </button>
      <span className="text-muted-foreground">{t("hint")}</span>
      <Link href="/organiser" className="text-primary underline">
        {nav("organiser")}
      </Link>
      <Link href="/developer" className="text-primary underline">
        {nav("developer")}
      </Link>
    </aside>
  );
}
