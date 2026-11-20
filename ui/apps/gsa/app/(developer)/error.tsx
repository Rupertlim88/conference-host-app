"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/** Shown when a signed-in page fails. Trying again renders the page afresh. */
export default function PageError({ reset }: { reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <div className="py-16 text-center">
      <p className="text-heading">{t("generic")}</p>
      <Button className="mt-4" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
