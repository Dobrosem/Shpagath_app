"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, ArrowUpRight, AudioLines, Building2, CheckCircle2, Circle, DatabaseBackup, ImageIcon, Loader2, MapPin, Music2, Trash2, X } from "lucide-react";
import { deleteTask, toggleTaskDone, updateTask } from "@/app/actions";
import type { ActionState, Event, Profile, Project, Song, Task } from "@/lib/types";
import { DateMeta, PriorityBadge, StatusBadge } from "./ui";
import { cn, formatDate, formatDuration, getEventPosterUrl, getSongResolvedCover, initials } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { translateEnum } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Pick<Profile, "id" | "full_name">[]>(
    task.assignee ? [task.assignee] : [],
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [mutating, startTransition] = useTransition();
  const [state, formAction, saving] = useActionState<ActionState, FormData>(
    updateTask.bind(null, task.id),
    { success: false, error: null },
  );
  const label = (ru: string, en: string) => locale === "en" ? en : ru;

  useEffect(() => {
    if (!open) return;
    let active = true;
    const supabase = createClient();
    if (!supabase) {
      setClientError(label("Supabase не настроен.", "Supabase is not configured."));
      return;
    }
    void supabase
      .from("profiles")
      .select("id,full_name")
      .order("full_name")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setClientError(label("Не удалось загрузить список ответственных.", "Could not load assignees."));
          return;
        }
        setProfiles(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [locale, open]);

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    router.refresh();
  }, [router, state.success]);

  function toggle() {
    setClientError(null);
    startTransition(async () => {
      const result = await toggleTaskDone(task.id, task.status, locale);
      if (result.error) {
        setClientError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(t("taskEdit.deleteConfirm"))) return;
    setClientError(null);
    startTransition(async () => {
      const result = await deleteTask(task.id, locale);
      if (result.error) {
        setClientError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return <article className={cn(
    "group rounded-xl border border-white/[.07] bg-white/[.018] p-4 transition hover:border-white/15 hover:bg-white/[.035]",
    task.status === "done" && "opacity-60",
  )}>
    <div className="flex items-start gap-3">
      <button
        type="button"
        className="mt-0.5 shrink-0 text-zinc-700 transition hover:text-emerald-400 disabled:opacity-50"
        aria-label={task.status === "done" ? t("taskEdit.reopen") : t("taskEdit.markDone")}
        title={task.status === "done" ? t("taskEdit.reopen") : t("taskEdit.markDone")}
        disabled={mutating}
        onClick={toggle}
      >
        {mutating
          ? <Loader2 className="animate-spin" size={18} />
          : task.status === "done"
            ? <CheckCircle2 className="text-emerald-400" size={18} />
            : <Circle className="group-hover:text-zinc-500" size={18} />}
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => {
        setClientError(null);
        setOpen(true);
      }}>
        <p className={cn("text-sm font-medium leading-5 text-zinc-200", task.status === "done" && "line-through decoration-zinc-600")}>{task.title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {!compact && <StatusBadge status={task.status} />}
          <DateMeta value={task.due_date} />
        </div>
        {task.project && <p className="mt-3 truncate text-xs text-zinc-600">{task.project.title}</p>}
      </button>
      {task.assignee && <span title={task.assignee.full_name} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-zinc-800 text-[9px] font-semibold text-zinc-300">{initials(task.assignee.full_name)}</span>}
    </div>
    {clientError && !open && <p className="mt-3 text-xs text-red-300">{clientError}</p>}
    {open && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !saving && !mutating && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("common.edit")}</p><h2 className="font-display text-2xl uppercase text-white">{t("taskEdit.title")}</h2></div>
          <button type="button" aria-label={t("common.close")} disabled={saving || mutating} onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white"><X /></button>
        </div>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <label className="sm:col-span-2"><span className="label">{label("Название", "Title")}</span><input className="field" name="title" required defaultValue={task.title} /></label>
          <label className="sm:col-span-2"><span className="label">{label("Описание", "Description")}</span><textarea className="field min-h-24 py-3" name="description" defaultValue={task.description ?? ""} /></label>
          <label><span className="label">{label("Статус", "Status")}</span>
            <select className="field" name="status" defaultValue={task.status}>
              {["todo", "in_progress", "review", "done", "cancelled"].map((status) => <option key={status} value={status}>{translateEnum(locale, status)}</option>)}
            </select>
          </label>
          <label><span className="label">{label("Приоритет", "Priority")}</span>
            <select className="field" name="priority" defaultValue={task.priority}>
              {["low", "normal", "high", "critical"].map((priority) => <option key={priority} value={priority}>{translateEnum(locale, priority)}</option>)}
            </select>
          </label>
          <label><span className="label">{label("Срок", "Due date")}</span><input className="field" type="date" name="due_date" defaultValue={task.due_date ?? ""} /></label>
          <label><span className="label">{t("taskEdit.assignee")}</span>
            <select className="field" name="assignee_id" defaultValue={task.assignee_id ?? ""}>
              <option value="">{label("Не назначен", "Unassigned")}</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}
            </select>
          </label>
          {task.project_id && <div className="sm:col-span-2">
            <span className="label">{label("Проект", "Project")}</span>
            <div className="field flex items-center text-zinc-400">{task.project?.title ?? task.project_id}</div>
          </div>}
          {(state.error || clientError) && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} className="shrink-0" />{state.error || clientError}</div>}
          <div className="mt-2 flex flex-wrap justify-between gap-2 sm:col-span-2">
            <button type="button" className="button-secondary border-red-500/20 text-red-300" disabled={saving || mutating} onClick={remove}>
              {mutating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{t("taskEdit.delete")}
            </button>
            <div className="flex gap-2">
              <button disabled={saving || mutating} type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
              <button disabled={saving || mutating} className="button-primary">{saving && <Loader2 size={14} className="animate-spin" />}{saving ? t("common.saving") : t("common.save")}</button>
            </div>
          </div>
        </form>
      </div>
    </div>}
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
  const displayCoverUrl = getSongResolvedCover(song);
  return <Link href={`/songs/${song.id}`} className="metal-card group relative overflow-hidden transition hover:border-white/15">
    <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[.06] bg-zinc-950">
      {displayCoverUrl
        ? <img src={displayCoverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,.07),transparent_68%)]">
          <span className="font-display text-5xl uppercase text-zinc-800">{song.title.trim().slice(0, 2) || "S"}</span>
        </div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />
      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
        <Music2 size={18} className="text-zinc-300" />
        <StatusBadge status={song.status} />
      </div>
    </div>
    <div className="p-5">
    <p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">
      {[song.album?.title, song.track_number ? `#${String(song.track_number).padStart(2, "0")}` : null, song.subtitle].filter(Boolean).join(" · ")}
    </p>
    <h3 className="mt-1 font-display text-xl uppercase tracking-wide text-zinc-100 group-hover:text-white">{song.title}</h3>
    <div className="mt-5 grid grid-cols-4 gap-2 border-t border-white/[.06] pt-4">
      {[["BPM", song.bpm], [t("song.key"), song.key], [t("song.tuning"), song.tuning], [t("song.timeSignature"), song.time_signature]].map(([key, value]) =>
        <div key={key as string}><p className="text-[8px] tracking-widest text-zinc-700">{key}</p><p className="mt-1 truncate text-xs text-zinc-400">{value ?? "—"}</p></div>)}
    </div>
    <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
      <AudioLines size={13} />{song.materials_count ?? 0} {t("song.materialCount")}
      {song.duration != null && <> · {formatDuration(song.duration)}</>}
      {song.arrangement_version && <> · {song.arrangement_version}</>}
    </p>
    {!!song.missing_backups_count && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400"><DatabaseBackup size={13} />{t("backup.missing")}: {song.missing_backups_count}</p>}
    </div>
  </Link>;
}

export function EventCard({ event }: { event: Event }) {
  const { locale } = useI18n();
  const date = new Date(event.starts_at);
  const posterUrl = getEventPosterUrl(event);
  return <Link href={`/events/${event.id}`} className="metal-card group flex min-h-48 overflow-hidden transition hover:border-white/15">
    <div className="relative flex w-32 shrink-0 flex-col items-center justify-center overflow-hidden border-r border-white/[.06] bg-zinc-950 sm:w-40">
      {posterUrl
        ? <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,.07),transparent_70%)]"><ImageIcon size={28} className="text-zinc-800" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-3 z-10 text-center">
        <span className="block font-display text-3xl text-zinc-100">{date.getDate().toString().padStart(2, "0")}</span>
        <span className="block text-[10px] uppercase tracking-[.18em] text-ember">{date.toLocaleString(locale, { month: "short" })} · {date.getFullYear()}</span>
      </div>
    </div>
    <div className="flex min-w-0 flex-1 flex-col p-5">
      <div className="flex items-center justify-between"><StatusBadge status={event.status} context="event" /><ArrowUpRight size={15} className="text-zinc-700 group-hover:text-zinc-300" /></div>
      <h3 className="mt-4 truncate font-display text-xl uppercase text-zinc-100">{event.title}</h3>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin size={13} />{event.city} · {event.venue}</p>
      <p className="mt-auto text-xs text-zinc-600">{formatDate(event.starts_at, true, locale)}</p>
    </div>
  </Link>;
}
