"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import type { Priority, Status } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { translateEnum } from "@/lib/i18n";

export function StatusBadge({ status, context }: { status: Status | string; context?: string }) {
  const { locale } = useI18n();
  const tone = ["done", "approved", "released", "ready", "live_ready", "published", "active"].includes(status)
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
    : ["in_progress", "mixing", "recording", "announced"].includes(status)
      ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
      : ["review", "waiting", "scheduled"].includes(status)
        ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
        : "border-white/10 bg-white/5 text-zinc-300";
  return <span className={cn("badge", tone)}><i className="h-1.5 w-1.5 rounded-full bg-current" />{translateEnum(locale, status, status, context)}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { locale } = useI18n();
  const tone = priority === "critical" ? "text-red-300 bg-red-500/10 border-red-500/25"
    : priority === "high" ? "text-orange-300 bg-orange-500/10 border-orange-500/25"
      : "text-zinc-400 bg-white/[.03] border-white/10";
  return <span className={cn("badge", tone)}>{translateEnum(locale, priority)}</span>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-semibold uppercase tracking-[.04em] text-white sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-zinc-500">{description}</p>}
    </div>
    {action}
  </header>;
}

export function SectionHeader({ title, href, label = "Смотреть все" }: { title: string; href?: string; label?: string }) {
  const { t } = useI18n();
  return <div className="mb-4 flex items-center justify-between">
    <h2 className="font-display text-lg font-medium uppercase tracking-[.08em] text-zinc-200">{title}</h2>
    {href && <Link href={href} className="flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white">{label === "Смотреть все" ? t("common.viewAll") : label}<ArrowUpRight size={13} /></Link>}
  </div>;
}

export function Metric({ label, value, accent, detail }: { label: string; value: string | number; accent?: boolean; detail?: string }) {
  return <div className="metal-card min-h-32 p-5">
    <p className="text-xs uppercase tracking-[.14em] text-zinc-600">{label}</p>
    <p className={cn("mt-3 font-display text-4xl font-semibold", accent ? "text-ember" : "text-zinc-100")}>{value}</p>
    {detail && <p className="mt-2 text-xs text-zinc-600">{detail}</p>}
  </div>;
}

export function DateMeta({ value, time }: { value?: string | null; time?: boolean }) {
  const { locale } = useI18n();
  return <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
    {time ? <Clock3 size={13} /> : <CalendarDays size={13} />}
    {formatDate(value, time, locale)}
  </span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="metal-card col-span-full px-6 py-14 text-center">
    <p className="font-display text-lg uppercase text-zinc-300">{title}</p>
    <p className="mt-2 text-sm text-zinc-600">{description}</p>
  </div>;
}
