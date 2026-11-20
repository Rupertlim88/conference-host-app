import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

/** As in GSA Meetings Guide: All and Unread tabs, and nothing to show. */
export function NotificationsView() {
  const t = useTranslations("notifications");
  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>
      <div className="mb-16 grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-semibold tracking-wide uppercase">
        <span className="rounded-md bg-foreground py-1.5 text-center text-background">{t("all")}</span>
        <span className="py-1.5 text-center">{t("unread", { count: 0 })}</span>
      </div>
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Mail className="size-20" aria-hidden />
        <p className="text-lg">{t("empty")}</p>
      </div>
    </>
  );
}
