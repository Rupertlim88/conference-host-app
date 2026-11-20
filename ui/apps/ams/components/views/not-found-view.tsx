import Link from "next/link";
import { useTranslations } from "next-intl";

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
