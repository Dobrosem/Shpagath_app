"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays, CalendarRange, CheckSquare2, CircleDollarSign, ContactRound,
  ClipboardList, Disc3, FileText, FolderKanban, Gauge, LogOut, Megaphone, Menu, Music2, PackageCheck, Settings,
  SlidersHorizontal, UserRound, UsersRound, X,
} from "lucide-react";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { translateLiteral } from "@/lib/i18n";

const navigationGroups = [
  {
    key: "nav.group.workspace" as const,
    items: [
      { href: "/dashboard", key: "nav.dashboard" as const, icon: Gauge },
      { href: "/my", key: "nav.my" as const, icon: UserRound },
      { href: "/tasks", key: "nav.tasks" as const, icon: CheckSquare2 },
      { href: "/projects", key: "nav.projects" as const, icon: FolderKanban },
    ],
  },
  {
    key: "nav.group.music" as const,
    items: [
      { href: "/songs", key: "nav.songs" as const, icon: Music2 },
      { href: "/albums", key: "nav.albums" as const, icon: Disc3 },
    ],
  },
  {
    key: "nav.group.live" as const,
    items: [
      { href: "/events", key: "nav.events" as const, icon: CalendarDays },
      { href: "/rehearsals", key: "nav.rehearsals" as const, icon: UsersRound },
      { href: "/packing-lists", key: "nav.packingLists" as const, icon: PackageCheck },
    ],
  },
  {
    key: "nav.group.promotion" as const,
    items: [
      { href: "/promo", key: "nav.promo" as const, icon: Megaphone },
      { href: "/epk", key: "nav.epk" as const, icon: FileText },
      { href: "/copy", key: "nav.copy" as const, icon: ClipboardList },
      { href: "/content-calendar", key: "nav.contentCalendar" as const, icon: CalendarRange },
    ],
  },
  {
    key: "nav.group.administration" as const,
    items: [
      { href: "/contacts", key: "nav.contacts" as const, icon: ContactRound },
      { href: "/finance", key: "nav.finance" as const, icon: CircleDollarSign },
      { href: "/settings", key: "nav.settings" as const, icon: Settings },
    ],
  },
];

const mobileNavigation = [
  { href: "/dashboard", key: "nav.dashboard" as const, icon: Gauge },
  { href: "/tasks", key: "nav.tasks" as const, icon: CheckSquare2 },
  { href: "/songs", key: "nav.songs" as const, icon: Music2 },
  { href: "/events", key: "nav.events" as const, icon: CalendarDays },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return <nav className="space-y-5">
    {navigationGroups.map((group) => <section key={group.key}>
      <p className="mb-2 px-3 text-[9px] font-medium uppercase tracking-[.22em] text-zinc-700">{t(group.key)}</p>
      <div className="space-y-1">
        {group.items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} onClick={onNavigate} className={cn("nav-item", active && "nav-item-active")}>
            <Icon size={17} strokeWidth={1.7} /><span>{t(key)}</span>
            {active && <span className="ml-auto h-1 w-1 rounded-full bg-ember" />}
          </Link>;
        })}
      </div>
    </section>)}
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 overflow-y-auto border-r border-white/[.06] bg-[#090a0a] px-4 py-6 lg:flex lg:flex-col">
      <div className="px-2"><Mark /></div>
      <div className="my-5 h-px bg-white/[.06]" />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <NavItems />
      </div>
      <div className="mt-4 space-y-1 border-t border-white/[.06] pt-4">
        <button onClick={signOut} className="nav-item w-full"><LogOut size={17} />{t("nav.logout")}</button>
      </div>
    </aside>

    {open && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden">
      <aside className="h-full w-72 overflow-y-auto border-r border-white/10 bg-[#090a0a] p-5">
        <div className="mb-8 flex items-center justify-between"><Mark /><button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)}><X /></button></div>
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
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-7 pb-24 sm:px-7 lg:pb-10">{children}</main>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-white/10 bg-[#090a0a]/95 px-2 backdrop-blur-xl lg:hidden">
      {mobileNavigation.map(({ href, key, icon: Icon }) => <Link key={href} href={href} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 px-1 text-center text-[9px] leading-tight text-zinc-600", pathname.startsWith(href) && "text-zinc-100")}><Icon size={18} /><span>{t(key)}</span></Link>)}
    </nav>
  </div>;
}
