"use client";

// A page that is missing says so, and a page that fails offers to try again.

import { NextIntlClientProvider, useTranslations } from "next-intl";
import Link from "next/link";

import { MEETING_ZONE } from "@/shared/app";
import text from "@/shared/text/en.json";
import { Button } from "@/shared/ui/button";

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

/** What Next.js hands an error page: reset only redraws in the browser; retry asks the server for the page again. */
type ErrorPageProps = { reset: () => void; retry: () => void };

function TryAgain({ retry }: { retry: () => void }) {
  const t = useTranslations("errors");
  return (
    <>
      <p className="text-heading">{t("generic")}</p>
      <Button className="mt-4" onClick={retry}>
        {t("retry")}
      </Button>
    </>
  );
}

/** Shown in the frame when a signed-in page fails. Trying again asks the server for the page afresh. */
export function PageError({ retry }: ErrorPageProps) {
  return (
    <div className="py-16 text-center">
      <TryAgain retry={retry} />
    </div>
  );
}

/** Shown when a failure happens outside any frame, such as in a layout or on the sign-in page: the page's main region. */
export function RootError({ retry }: ErrorPageProps) {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <TryAgain retry={retry} />
    </main>
  );
}

/** Shown when the root layout itself fails. It replaces the whole document, so it brings its own html, body and
 *  English words. */
export function GlobalError({ reset, retry }: ErrorPageProps) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider locale="en" messages={text} timeZone={MEETING_ZONE}>
          <RootError reset={reset} retry={retry} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
