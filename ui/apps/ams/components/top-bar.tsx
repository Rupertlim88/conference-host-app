"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { NavLinks } from "./nav-links";
import { TimeZoneSwitch } from "./time-zone";

/** The meeting app's grey bar: sign-out and the time-zone switch on the left, search and the phone menu on the right. */
export function TopBar({ signOut }: { signOut: React.ReactNode }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-12 items-center justify-between border-b bg-neutral-100 px-3">
      <div className="flex items-center gap-3">
        {signOut}
        <TimeZoneSwitch />
      </div>
      <div className="flex items-center gap-3 text-heading">
        <Link href="/search" aria-label={t("search")}>
          <Search className="size-6" aria-hidden />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger aria-label={t("menu")} className="lg:hidden">
            <Menu className="size-7" aria-hidden />
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader>
              <SheetTitle>{t("menu")}</SheetTitle>
            </SheetHeader>
            <NavLinks onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
