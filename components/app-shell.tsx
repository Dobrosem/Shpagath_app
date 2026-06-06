"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays, CheckSquare2, ChevronDown, CircleDollarSign, ContactRound,
  FolderKanban, Gauge, LogOut, Megaphone, Menu, Music2, Settings, SlidersHorizontal, UsersRound, X,
} from "lucide-react";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { translateLiteral } from "@/lib/i18n";

const navigation = [
  { href: "/dashboard", key: "nav.dashboard" as const, icon: Gauge },
  { href: "/projects", key: "nav.projects" as const, icon: FolderKanban },
  { href: "/tasks", key: "nav.tasks" as const, icon: CheckSquare2 },
  { href: "/songs", key: "nav.songs" as const, icon: Music2 },
  { href: "/events", key: "nav.events" as const, icon: CalendarDays },
  { href: "/rehearsals", key: "nav.rehearsals" as const, icon: UsersRound },
  { href: "/promo", key: "nav.promo" as const, icon: Megaphone },
  { href: "/contacts", key: "nav.contacts" as const, icon: ContactRound },
  { href: "/finance", key: "nav.finance" as const, icon: CircleDollarSign },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return <nav className="space-y-1">
    {navigation.map(({ href, key, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} onClick={onNavigate} className={cn("nav-item", active && "nav-item-active")}>
        <Icon size={17} strokeWidth={1.7} /><span>{t(key)}</span>
        {active && <span className="ml-auto h-1 w-1 rounded-full bg-ember" />}
      </Link>;
    })}
  </nav>;
}

function Mark() {
  const { locale } = useI18n();
  return <Link href="/dashboard" className="flex items-center gap-3">
    <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-sm border border-white/15 bg-zinc-950 font-display text-xl text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-ember">S</div>
    <div><p className="font-display text-base font-semibold uppercase tracking-[.22em] text-zinc-100">Saphath</p><p className="text-[8px] uppercase tracking-[.28em] text-zinc-600">{locale === "en" ? "Workspace" : "Рабочая система"}</p></div>
  </Link>;
}

export function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useI18n();
  async function signOut() {
    await createClient()?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <div className="min-h-screen bg-void text-zinc-300">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-white/[.06] bg-[#090a0a] px-4 py-6 lg:flex lg:flex-col">
      <div className="px-2"><Mark /></div>
      <div className="my-7 h-px bg-white/[.06]" />
      <NavItems />
      <div className="mt-auto space-y-1 border-t border-white/[.06] pt-4">
        <Link href="/settings" className="nav-item"><Settings size={17} />{t("nav.settings")}</Link>
        <button onClick={signOut} className="nav-item w-full"><LogOut size={17} />{t("nav.logout")}</button>
      </div>
    </aside>

    {open && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden">
      <aside className="h-full w-72 border-r border-white/10 bg-[#090a0a] p-5">
        <div className="mb-8 flex items-center justify-between"><Mark /><button onClick={() => setOpen(false)}><X /></button></div>
        <NavItems onNavigate={() => setOpen(false)} />
      </aside>
    </div>}

    <div className="lg:pl-60">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[.06] bg-void/85 px-4 backdrop-blur-xl sm:px-7">
        <button className="lg:hidden" onClick={() => setOpen(true)} aria-label={t("common.openMenu")}><Menu size={21} /></button>
        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[.15em] text-zinc-700 lg:flex"><SlidersHorizontal size={13} /> {t("common.internalPortal")}</div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block"><p className="text-xs text-zinc-300">{profile.full_name}</p><p className="text-[9px] uppercase tracking-wider text-zinc-600">{translateLiteral(locale, profile.role)}</p></div>
          <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-zinc-800 text-[10px] font-semibold">{initials(profile.full_name)}</div>
          <ChevronDown size={13} className="text-zinc-600" />
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-7 pb-24 sm:px-7 lg:pb-10">{children}</main>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-white/10 bg-[#090a0a]/95 px-2 backdrop-blur-xl lg:hidden">
      {navigation.slice(0, 5).map(({ href, key, icon: Icon }) => <Link key={href} href={href} className={cn("flex flex-col items-center gap-1 px-3 text-[9px] text-zinc-600", pathname.startsWith(href) && "text-zinc-100")}><Icon size={18} /><span>{t(key)}</span></Link>)}
    </nav>
  </div>;
}
