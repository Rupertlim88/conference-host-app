import Form from "next/form";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The search form. A plain GET to /search, which next/form turns into a client-side visit. */
export function SearchBox({ initial }: { initial: string }) {
  const t = useTranslations("search");
  return (
    <Form action="/search" role="search" className="mb-5 flex gap-2">
      <Input name="q" defaultValue={initial} placeholder={t("placeholder")} aria-label={t("placeholder")} />
      <Button type="submit">{t("submit")}</Button>
    </Form>
  );
}
