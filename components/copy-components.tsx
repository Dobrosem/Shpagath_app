"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Archive, Check, CheckCircle2, Clipboard, Copy as CopyIcon, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  approveCopyItem,
  archiveCopyItem,
  createCopyItem,
  createCopyItemVersion,
  deleteCopyItem,
  updateCopyItem,
} from "@/app/actions";
import { translateEnum } from "@/lib/i18n";
import type { ActionState, Album, CopyCategory, CopyChannel, CopyItem, CopyStatus, EpkProfile, Event, Locale, Song } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

const initialState: ActionState = { success: false, error: null };
const copyCategories: CopyCategory[] = ["concert_announcement", "concert_reminder", "release_announcement", "song_description", "epk_bio", "press_release", "festival_pitch", "social_post", "ad_copy", "telegram_post", "vk_post", "email", "other"];
const copyChannels: CopyChannel[] = ["vk", "telegram", "instagram", "youtube", "press", "email", "website", "ads", "internal", "other"];
const copyStatuses: CopyStatus[] = ["draft", "review", "approved", "archived"];

export type CopyRelationOptions = {
  events: Pick<Event, "id" | "title">[];
  albums: Pick<Album, "id" | "title">[];
  songs: Pick<Song, "id" | "title">[];
  epks: Pick<EpkProfile, "id" | "title">[];
};

function statusTone(status: CopyStatus) {
  if (status === "approved") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (status === "review") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  if (status === "archived") return "border-white/10 bg-white/5 text-zinc-500";
  return "border-blue-500/25 bg-blue-500/10 text-blue-300";
}

function CopyBadge({ status }: { status: CopyStatus }) {
  const { locale } = useI18n();
  return <span className={cn("badge", statusTone(status))}><i className="h-1.5 w-1.5 rounded-full bg-current" />{translateEnum(locale, status)}</span>;
}

export function CopyClipboardButton({ body, compact }: { body: string; compact?: boolean }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <button type="button" className={compact ? "button-secondary min-h-9 px-3" : "button-secondary"} onClick={copy}>
    {copied ? <Check size={14} /> : <CopyIcon size={14} />}{copied ? t("copy.copied") : t("copy.copy")}
  </button>;
}

function CopyFormFields({
  item,
  options,
  defaults,
}: {
  item?: CopyItem;
  options: CopyRelationOptions;
  defaults?: Partial<Pick<CopyItem, "event_id" | "album_id" | "song_id" | "epk_id" | "category">>;
}) {
  const { locale, t } = useI18n();
  const selected = {
    event_id: item?.event_id ?? defaults?.event_id ?? "",
    album_id: item?.album_id ?? defaults?.album_id ?? "",
    song_id: item?.song_id ?? defaults?.song_id ?? "",
    epk_id: item?.epk_id ?? defaults?.epk_id ?? "",
  };
  return <>
    <input type="hidden" name="locale" value={locale} />
    <label className="sm:col-span-2"><span className="label">{t("copy.title")}</span><input name="title" className="field" required defaultValue={item?.title ?? ""} /></label>
    <label><span className="label">{t("copy.category")}</span>
      <select name="category" className="field" defaultValue={item?.category ?? defaults?.category ?? "social_post"}>
        {copyCategories.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}
      </select>
    </label>
    <label><span className="label">{t("copy.channel")}</span>
      <select name="channel" className="field" defaultValue={item?.channel ?? ""}>
        <option value="">{t("common.select")}</option>
        {copyChannels.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}
      </select>
    </label>
    <label><span className="label">{t("copy.language")}</span>
      <select name="language" className="field" defaultValue={item?.language ?? locale}>
        <option value="ru">{t("language.ru")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
    </label>
    <label><span className="label">{t("copy.status")}</span>
      <select name="status" className="field" defaultValue={item?.status ?? "draft"}>
        {copyStatuses.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}
      </select>
    </label>
    <label className="sm:col-span-2"><span className="label">{t("copy.body")}</span><textarea name="body" className="field min-h-72 resize-y py-3 font-mono text-sm leading-6" required defaultValue={item?.body ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{t("copy.notes")}</span><textarea name="notes" className="field min-h-24 resize-y py-3" defaultValue={item?.notes ?? ""} /></label>
    <div className="sm:col-span-2 border-t border-white/[.06] pt-4">
      <p className="mb-3 text-xs uppercase tracking-[.14em] text-zinc-600">{t("copy.relations")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">{t("copy.event")}</span><select name="event_id" className="field" defaultValue={selected.event_id}><option value="">{t("common.select")}</option>{options.events.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
        <label><span className="label">{t("copy.album")}</span><select name="album_id" className="field" defaultValue={selected.album_id}><option value="">{t("common.select")}</option>{options.albums.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
        <label><span className="label">{t("copy.song")}</span><select name="song_id" className="field" defaultValue={selected.song_id}><option value="">{t("common.select")}</option>{options.songs.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
        <label><span className="label">EPK</span><select name="epk_id" className="field" defaultValue={selected.epk_id}><option value="">{t("common.select")}</option>{options.epks.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
      </div>
    </div>
  </>;
}

export function CopyCreateButton({ options, defaults, label }: { options: CopyRelationOptions; defaults?: Partial<Pick<CopyItem, "event_id" | "album_id" | "song_id" | "epk_id" | "category">>; label?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCopyItem, initialState);

  useEffect(() => {
    if (!state.success || !state.id) return;
    setOpen(false);
    router.push(`/copy/${state.id}`);
  }, [router, state]);

  return <>
    <button type="button" className="button-primary" onClick={() => setOpen(true)}><Plus size={15} />{label ?? t("copy.create")}</button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("copy.library")}</p><h2 className="font-display text-2xl uppercase text-white">{t("copy.create")}</h2></div>
          <button type="button" className="text-zinc-600 hover:text-white" aria-label={t("common.close")} onClick={() => setOpen(false)}><X /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <CopyFormFields options={options} defaults={defaults} />
          {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} />{state.error}</div>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("copy.create")}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}

export function CopyItemCard({ item }: { item: CopyItem }) {
  const { locale, t } = useI18n();
  const relations = [
    item.event && `${t("copy.event")}: ${item.event.title}`,
    item.album && `${t("copy.album")}: ${item.album.title}`,
    item.song && `${t("copy.song")}: ${item.song.title}`,
    item.epk && `EPK: ${item.epk.title}`,
  ].filter(Boolean);
  return <article className={cn("metal-card p-5 transition hover:border-white/15", item.status === "approved" && "border-emerald-500/20")}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">{translateEnum(locale, item.category)}</p>
        <Link href={`/copy/${item.id}`} className="mt-1 block font-display text-xl uppercase text-white hover:text-zinc-200">{item.title}</Link>
      </div>
      <CopyBadge status={item.status} />
    </div>
    <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{item.body}</p>
    {!!relations.length && <p className="mt-4 line-clamp-2 text-xs text-zinc-600">{relations.join(" · ")}</p>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.06] pt-4">
      <span className="text-[10px] uppercase tracking-[.14em] text-zinc-700">
        {[item.channel ? translateEnum(locale, item.channel) : null, item.language.toUpperCase()].filter(Boolean).join(" · ")}
      </span>
      <CopyClipboardButton body={item.body} compact />
    </div>
  </article>;
}

export function CopyItemEditor({ item, options, canDelete }: { item: CopyItem; options: CopyRelationOptions; canDelete: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(updateCopyItem.bind(null, item.id), initialState);
  const [versionState, versionAction, versionPending] = useActionState(createCopyItemVersion.bind(null, item.id), initialState);
  const [mutating, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);

  function mutate(callback: () => Promise<ActionState>) {
    setClientError(null);
    startTransition(async () => {
      const result = await callback();
      if (result.error) {
        setClientError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(t("copy.deleteConfirm"))) return;
    mutate(async () => {
      const result = await deleteCopyItem(item.id, locale);
      if (!result.error) router.push("/copy");
      return result;
    });
  }

  return <div className="space-y-5">
    <form action={action} className="metal-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:col-span-2">
        <div><p className="eyebrow">{t("copy.edit")}</p><h2 className="font-display text-xl uppercase text-white">{t("copy.library")}</h2></div>
        <div className="flex flex-wrap gap-2">
          <CopyClipboardButton body={item.body} />
          <button type="button" className="button-secondary" disabled={mutating} onClick={() => mutate(() => approveCopyItem(item.id, locale))}><CheckCircle2 size={14} />{t("copy.approved")}</button>
          <button type="button" className="button-secondary" disabled={mutating} onClick={() => mutate(() => archiveCopyItem(item.id, locale))}><Archive size={14} />{t("copy.archive")}</button>
        </div>
      </div>
      <CopyFormFields item={item} options={options} />
      {(state.error || clientError) && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} />{state.error || clientError}</div>}
      {state.success && <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 sm:col-span-2"><CheckCircle2 size={15} />{t("common.save")}</div>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-white/[.06] pt-4 sm:col-span-2">
        <button className="button-primary" disabled={pending || mutating}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
      </div>
    </form>

    <section className="metal-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">{t("copy.versionHistory")}</p><h2 className="font-display text-xl uppercase text-white">{t("copy.version")}</h2></div>
        <form action={versionAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="body" value={item.body} />
          <input name="version_notes" className="field h-10 w-52" placeholder={t("copy.notes")} />
          <button className="button-secondary" disabled={versionPending}>{versionPending && <Loader2 size={14} className="animate-spin" />}{t("copy.saveVersion")}</button>
        </form>
      </div>
      {versionState.error && <p className="mb-3 text-xs text-red-300">{versionState.error}</p>}
      <div className="divide-y divide-white/[.06]">
        {(item.versions ?? []).map((version) => <article key={version.id} className="py-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
            <span>{formatDate(version.created_at, true, locale)}</span>
            <span>{version.author?.full_name ?? "—"}</span>
          </div>
          {version.notes && <p className="mb-2 text-xs text-zinc-500">{version.notes}</p>}
          <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{version.body}</p>
        </article>)}
        {!item.versions?.length && <p className="py-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
      </div>
    </section>

    {canDelete && <section className="metal-card flex flex-wrap items-center justify-between gap-3 border-red-500/10 p-5">
      <div>
        <p className="font-display text-sm uppercase tracking-wider text-red-300">{t("copy.dangerZone")}</p>
        <p className="mt-2 text-xs text-zinc-600">{t("copy.deleteConfirm")}</p>
      </div>
      <button type="button" className="button-secondary border-red-500/20 text-red-300 hover:bg-red-500/10" disabled={mutating || pending} onClick={remove}>
        {mutating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{t("copy.delete")}
      </button>
    </section>}
  </div>;
}

export function RelatedCopyPanel({
  title,
  createLabel,
  items,
  options,
  defaults,
}: {
  title: string;
  createLabel: string;
  items: CopyItem[];
  options: CopyRelationOptions;
  defaults: Partial<Pick<CopyItem, "event_id" | "album_id" | "song_id" | "epk_id" | "category">>;
}) {
  const { locale, t } = useI18n();
  return <section className="metal-card p-5 sm:p-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg uppercase text-white">{title}</h2>
      <CopyCreateButton options={options} defaults={defaults} label={createLabel} />
    </div>
    <div className="space-y-3">
      {items.map((item) => <div key={item.id} className="rounded-lg border border-white/[.06] p-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/copy/${item.id}`} className="min-w-0 font-medium text-zinc-200 hover:text-white">{item.title}</Link>
          <CopyBadge status={item.status} />
        </div>
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-zinc-600">{item.body}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[.14em] text-zinc-700">{translateEnum(locale, item.category)}</span>
          <CopyClipboardButton body={item.body} compact />
        </div>
      </div>)}
      {!items.length && <p className="py-5 text-center text-sm text-zinc-600">{t("copy.noItems")}</p>}
    </div>
    <Link href="/copy" className="mt-4 inline-flex text-xs text-zinc-500 hover:text-white">{t("common.viewAll")}</Link>
  </section>;
}
