import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** The conference API's page for checking a credential, opened in a new tab. Nothing when none is set. */
export function VerifyLink({ url, className }: { url: string | null; className?: string }) {
  const t = useTranslations("app");
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1 underline", className)}>
      <ShieldCheck className="size-4" aria-hidden />
      {t("verify")}
    </a>
  );
}
