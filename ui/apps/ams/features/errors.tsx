"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/features/ui/button";

/** What an unknown address or id shows: the message and a way home. Its page decides whether it is the main region. */
export function NotFoundView() {
  const t = useTranslations("errors");
  return (
    <>
      <p className="text-lg text-heading">{t("notFound")}</p>
      <Link href="/" className="mt-4 inline-block text-primary underline">
        {t("home")}
      </Link>
    </>
  );
}

/** An address that matches no page: shown without any frame, so it is the page's main region. */
export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <NotFoundView />
    </main>
  );
}

/** An unknown id inside the app or a console: shown in the frame's main region, so it has none of its own. */
export function FramedNotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <NotFoundView />
    </div>
  );
}

/** Shown when a signed-in page fails. Trying again renders the page afresh. */
export function PageError({ reset }: { reset: () => void }) {
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
