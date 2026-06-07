"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, ShieldAlert } from "lucide-react";
import type { RedZoneIssue } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

export function RedZone({ issues, compact = false }: { issues: RedZoneIssue[]; compact?: boolean }) {
  const { locale, t } = useI18n();
  return <section>
    <div className="mb-4">
      <h2 className="font-display text-lg font-medium uppercase tracking-[.08em] text-zinc-200">
        {t("redZone.title")}
      </h2>
      {!compact && <p className="mt-1 text-xs text-zinc-600">{t("redZone.description")}</p>}
    </div>
    <div className="metal-card divide-y divide-white/[.055]">
      {issues.slice(0, compact ? 5 : undefined).map((issue) => (
        <Link key={issue.id} href={issue.href} className="flex items-start gap-3 p-4 transition hover:bg-white/[.025]">
          <div className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            issue.severity === "critical"
              ? "bg-red-500/10 text-red-300"
              : "bg-amber-500/10 text-amber-300",
          )}>
            {issue.severity === "critical" ? <ShieldAlert size={15} /> : <AlertTriangle size={15} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "text-[9px] uppercase tracking-wider",
                issue.severity === "critical" ? "text-red-400" : "text-amber-400",
              )}>
                {t(issue.severity === "critical" ? "redZone.critical" : "redZone.warning")}
              </span>
              <span className="text-[10px] text-zinc-600">{t(`redZone.${issue.kind}`)}</span>
            </div>
            <p className="mt-1 truncate text-sm text-zinc-200">{issue.title}</p>
            {issue.date && <p className="mt-1 text-[10px] text-zinc-600">{formatDate(issue.date, false, locale)}</p>}
          </div>
          <ArrowUpRight size={14} className="mt-2 shrink-0 text-zinc-700" />
        </Link>
      ))}
      {!issues.length && <p className="p-8 text-center text-sm text-zinc-600">{t("redZone.empty")}</p>}
    </div>
  </section>;
}

