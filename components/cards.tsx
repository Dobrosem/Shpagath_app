"use client";

import Link from "next/link";
import { ArrowUpRight, AudioLines, Building2, CheckCircle2, Circle, DatabaseBackup, MapPin, Music2 } from "lucide-react";
import type { Event, Project, Song, Task } from "@/lib/types";
import { DateMeta, PriorityBadge, StatusBadge } from "./ui";
import { formatDate, initials } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { translateEnum } from "@/lib/i18n";

export function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  return <article className="group rounded-xl border border-white/[.07] bg-white/[.018] p-4 transition hover:border-white/15 hover:bg-white/[.035]">
    <div className="flex items-start gap-3">
      {task.status === "done" ? <CheckCircle2 className="mt-0.5 text-emerald-400" size={18} /> : <Circle className="mt-0.5 text-zinc-700 group-hover:text-zinc-500" size={18} />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-zinc-200">{task.title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {!compact && <StatusBadge status={task.status} />}
          <DateMeta value={task.due_date} />
        </div>
        {task.project && <p className="mt-3 truncate text-xs text-zinc-600">{task.project.title}</p>}
      </div>
      {task.assignee && <span title={task.assignee.full_name} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-zinc-800 text-[9px] font-semibold text-zinc-300">{initials(task.assignee.full_name)}</span>}
    </div>
  </article>;
}

export function ProjectCard({ project }: { project: Project }) {
  const { locale } = useI18n();
  const projectType = translateEnum(locale, project.type);
  return <Link href={`/projects/${project.id}`} className="metal-card group block p-5 transition hover:-translate-y-0.5 hover:border-white/15">
    <div className="flex items-start justify-between gap-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[.03]"><Building2 size={18} className="text-zinc-400" /></div>
      <PriorityBadge priority={project.priority} />
    </div>
    <p className="mt-5 text-[10px] uppercase tracking-[.16em] text-zinc-600">{projectType}</p>
    <h3 className="mt-1 text-lg font-medium text-zinc-100 group-hover:text-white">{project.title}</h3>
    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-600">{project.description}</p>
    <div className="mt-5 flex items-center justify-between"><StatusBadge status={project.status} /><DateMeta value={project.deadline} /></div>
    <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gradient-to-r from-zinc-600 to-zinc-300" style={{ width: `${project.progress ?? 0}%` }} /></div>
    <p className="mt-2 text-right text-[10px] text-zinc-600">{project.progress ?? 0}%</p>
  </Link>;
}

export function SongCard({ song }: { song: Song }) {
  const { t } = useI18n();
  return <Link href={`/songs/${song.id}`} className="metal-card group relative overflow-hidden p-5 transition hover:border-white/15">
    <div className="absolute right-0 top-0 h-32 w-32 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.055),transparent_67%)]" />
    <div className="flex items-start justify-between"><Music2 size={19} className="text-zinc-500" /><StatusBadge status={song.status} /></div>
    <p className="mt-8 text-[10px] uppercase tracking-[.16em] text-zinc-600">{song.subtitle}</p>
    <h3 className="mt-1 font-display text-xl uppercase tracking-wide text-zinc-100 group-hover:text-white">{song.title}</h3>
    <div className="mt-5 grid grid-cols-4 gap-2 border-t border-white/[.06] pt-4">
      {[["BPM", song.bpm], [t("song.key"), song.key], [t("song.tuning"), song.tuning], [t("song.timeSignature"), song.time_signature]].map(([key, value]) =>
        <div key={key as string}><p className="text-[8px] tracking-widest text-zinc-700">{key}</p><p className="mt-1 truncate text-xs text-zinc-400">{value ?? "—"}</p></div>)}
    </div>
    <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600"><AudioLines size={13} />{song.materials_count ?? 0} {t("song.materialCount")} · {song.arrangement_version}</p>
    {!!song.missing_backups_count && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400"><DatabaseBackup size={13} />{t("backup.missing")}: {song.missing_backups_count}</p>}
  </Link>;
}

export function EventCard({ event }: { event: Event }) {
  const { locale } = useI18n();
  const date = new Date(event.starts_at);
  return <Link href={`/events/${event.id}`} className="metal-card group flex min-h-44 overflow-hidden transition hover:border-white/15">
    <div className="flex w-24 shrink-0 flex-col items-center justify-center border-r border-white/[.06] bg-white/[.018]">
      <span className="font-display text-4xl text-zinc-100">{date.getDate().toString().padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-[.18em] text-ember">{date.toLocaleString(locale, { month: "short" })}</span>
      <span className="mt-1 text-[10px] text-zinc-700">{date.getFullYear()}</span>
    </div>
    <div className="flex min-w-0 flex-1 flex-col p-5">
      <div className="flex items-center justify-between"><StatusBadge status={event.status} context="event" /><ArrowUpRight size={15} className="text-zinc-700 group-hover:text-zinc-300" /></div>
      <h3 className="mt-4 truncate font-display text-xl uppercase text-zinc-100">{event.title}</h3>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin size={13} />{event.city} · {event.venue}</p>
      <p className="mt-auto text-xs text-zinc-600">{formatDate(event.starts_at, true, locale)}</p>
    </div>
  </Link>;
}
