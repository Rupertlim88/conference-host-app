"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { TimeZoneSwitch } from "./time-zone";

/** Guidebook's green bar: the menu on the left, the guide's name, then the time-zone switch and sign-out. */
export function TopBar({ title, signOut }: { title: string; signOut: React.ReactNode }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-14 items-center gap-3 bg-bar px-3 text-white">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger aria-label={t("menu")} className="lg:hidden">
          <Menu className="size-7" aria-hidden />
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <span className="min-w-0 flex-1 truncate text-lg">{title}</span>
      <TimeZoneSwitch />
      <span className="[&_*]:text-white">{signOut}</span>
    </div>
  );
}
