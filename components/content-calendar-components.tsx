"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Archive, CalendarPlus, CheckCircle2, ExternalLink, Loader2, Send, Trash2, X } from "lucide-react";
import {
  archiveContentCalendarItem,
  cancelContentCalendarItem,
  createContentCalendarItem,
  deleteContentCalendarItem,
  markContentCalendarItemPublished,
  updateContentCalendarItem,
} from "@/app/actions";
import { translateEnum } from "@/lib/i18n";
import type { ActionState, Album, ContentCalendarItem, ContentChannel, ContentStatus, ContentType, CopyItem, EpkProfile, Event, Song } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { CopyClipboardButton } from "./copy-components";

const initialState: ActionState = { success: false, error: null };
const channels: ContentChannel[] = ["vk", "telegram", "instagram", "youtube", "website", "email", "ads", "press", "internal", "other"];
const contentTypes: ContentType[] = ["post", "story", "reels", "shorts", "video", "announcement", "reminder", "press_release", "ad", "email", "article", "other"];
const statuses: ContentStatus[] = ["idea", "draft", "ready", "scheduled", "published", "cancelled", "archived"];

export type ContentCalendarOptions = {
  copyItems: Pick<CopyItem, "id" | "title" | "body">[];
  events: Pick<Event, "id" | "title">[];
  albums: Pick<Album, "id" | "title">[];
  songs: Pick<Song, "id" | "title">[];
  epks: Pick<EpkProfile, "id" | "title">[];
};

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusTone(status: ContentStatus, overdue?: boolean) {
  if (overdue) return "border-red-500/25 bg-red-500/10 text-red-300";
  if (status === "published") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (status === "scheduled" || status === "ready") return "border-blue-500/25 bg-blue-500/10 text-blue-300";
  if (status === "cancelled" || status === "archived") return "border-white/10 bg-white/5 text-zinc-500";
  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

function CalendarBadge({ status, overdue }: { status: ContentStatus; overdue?: boolean }) {
  const { locale, t } = useI18n();
  return <span className={cn("badge", statusTone(status, overdue))}>
    <i className="h-1.5 w-1.5 rounded-full bg-current" />{overdue ? t("contentCalendar.overdue") : translateEnum(locale, status)}
  </span>;
}

function ContentCalendarFormFields({
  item,
  options,
  defaults,
}: {
  item?: ContentCalendarItem;
  options: ContentCalendarOptions;
  defaults?: Partial<Pick<ContentCalendarItem, "copy_item_id" | "event_id" | "album_id" | "song_id" | "epk_id" | "channel" | "content_type">>;
}) {
  const { locale, t } = useI18n();
  const selected = {
    copy_item_id: item?.copy_item_id ?? defaults?.copy_item_id ?? "",
    event_id: item?.event_id ?? defaults?.event_id ?? "",
    album_id: item?.album_id ?? defaults?.album_id ?? "",
    song_id: item?.song_id ?? defaults?.song_id ?? "",
    epk_id: item?.epk_id ?? defaults?.epk_id ?? "",
  };
  return <>
    <input type="hidden" name="locale" value={locale} />
    <label className="sm:col-span-2"><span className="label">{t("contentCalendar.title")}</span><input name="title" className="field" required defaultValue={item?.title ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{t("contentCalendar.description")}</span><textarea name="description" className="field min-h-24 resize-y py-3" defaultValue={item?.description ?? ""} /></label>
    <label><span className="label">{t("contentCalendar.channel")}</span><select name="channel" className="field" defaultValue={item?.channel ?? defaults?.channel ?? "vk"}>{channels.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}</select></label>
    <label><span className="label">{t("contentCalendar.contentType")}</span><select name="content_type" className="field" defaultValue={item?.content_type ?? defaults?.content_type ?? "post"}>{contentTypes.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}</select></label>
    <label><span className="label">{t("contentCalendar.status")}</span><select name="status" className="field" defaultValue={item?.status ?? "draft"}>{statuses.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}</select></label>
    <label><span className="label">{t("contentCalendar.scheduledDate")}</span><input type="datetime-local" name="scheduled_at" className="field" defaultValue={toDatetimeLocal(item?.scheduled_at)} /></label>
    <label><span className="label">{t("contentCalendar.publishedDate")}</span><input type="datetime-local" name="published_at" className="field" defaultValue={toDatetimeLocal(item?.published_at)} /></label>
    <label><span className="label">{t("contentCalendar.linkedCopy")}</span><select name="copy_item_id" className="field" defaultValue={selected.copy_item_id}><option value="">{t("common.select")}</option>{options.copyItems.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("copy.event")}</span><select name="event_id" className="field" defaultValue={selected.event_id}><option value="">{t("common.select")}</option>{options.events.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("copy.album")}</span><select name="album_id" className="field" defaultValue={selected.album_id}><option value="">{t("common.select")}</option>{options.albums.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("copy.song")}</span><select name="song_id" className="field" defaultValue={selected.song_id}><option value="">{t("common.select")}</option>{options.songs.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">EPK</span><select name="epk_id" className="field" defaultValue={selected.epk_id}><option value="">{t("common.select")}</option>{options.epks.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("contentCalendar.asset")}</span><input name="asset_url" type="url" className="field" defaultValue={item?.asset_url ?? ""} /></label>
    <label><span className="label">{t("contentCalendar.resultLink")}</span><input name="result_url" type="url" className="field" defaultValue={item?.result_url ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{t("copy.notes")}</span><textarea name="notes" className="field min-h-24 resize-y py-3" defaultValue={item?.notes ?? ""} /></label>
  </>;
}

export function ContentCalendarCreateButton({ options, defaults, label }: { options: ContentCalendarOptions; defaults?: Partial<Pick<ContentCalendarItem, "copy_item_id" | "event_id" | "album_id" | "song_id" | "epk_id" | "channel" | "content_type">>; label?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createContentCalendarItem, initialState);

  useEffect(() => {
    if (!state.success || !state.id) return;
    setOpen(false);
    router.push(`/content-calendar/${state.id}`);
  }, [router, state]);

  return <>
    <button type="button" className="button-primary" onClick={() => setOpen(true)}><CalendarPlus size={15} />{label ?? t("contentCalendar.create")}</button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("contentCalendar.titlePage")}</p><h2 className="font-display text-2xl uppercase text-white">{t("contentCalendar.create")}</h2></div>
          <button type="button" className="text-zinc-600 hover:text-white" aria-label={t("common.close")} onClick={() => setOpen(false)}><X /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <ContentCalendarFormFields options={options} defaults={defaults} />
          {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} />{state.error}</div>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("contentCalendar.create")}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}

export function ContentCalendarCard({ item }: { item: ContentCalendarItem }) {
  const { locale, t } = useI18n();
  const overdue = Boolean(item.scheduled_at && new Date(item.scheduled_at) < new Date() && !["published", "cancelled", "archived"].includes(item.status));
  const relations = [
    item.copy_item && `${t("contentCalendar.linkedCopy")}: ${item.copy_item.title}`,
    item.event && `${t("copy.event")}: ${item.event.title}`,
    item.album && `${t("copy.album")}: ${item.album.title}`,
    item.song && `${t("copy.song")}: ${item.song.title}`,
    item.epk && `EPK: ${item.epk.title}`,
  ].filter(Boolean);
  return <article className={cn("metal-card p-5 transition hover:border-white/15", overdue && "border-red-500/20")}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">{translateEnum(locale, item.channel)} · {translateEnum(locale, item.content_type)}</p>
        <Link href={`/content-calendar/${item.id}`} className="mt-1 block font-display text-xl uppercase text-white hover:text-zinc-200">{item.title}</Link>
      </div>
      <CalendarBadge status={item.status} overdue={overdue} />
    </div>
    {item.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">{item.description}</p>}
    <p className="mt-4 text-xs text-zinc-600">{item.scheduled_at ? formatDate(item.scheduled_at, true, locale) : t("contentCalendar.noDate")}</p>
    {!!relations.length && <p className="mt-3 line-clamp-2 text-xs text-zinc-600">{relations.join(" · ")}</p>}
  </article>;
}

export function ContentCalendarEditor({ item, options, canDelete }: { item: ContentCalendarItem; options: ContentCalendarOptions; canDelete: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(updateContentCalendarItem.bind(null, item.id), initialState);
  const [mutating, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);

  function mutate(callback: () => Promise<ActionState>, after?: () => void) {
    setClientError(null);
    startTransition(async () => {
      const result = await callback();
      if (result.error) {
        setClientError(result.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(t("contentCalendar.deleteConfirm"))) return;
    mutate(() => deleteContentCalendarItem(item.id, locale), () => router.push("/content-calendar"));
  }

  return <div className="space-y-5">
    <form action={action} className="metal-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:col-span-2">
        <div><p className="eyebrow">{t("contentCalendar.edit")}</p><h2 className="font-display text-xl uppercase text-white">{t("contentCalendar.titlePage")}</h2></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-secondary" disabled={mutating} onClick={() => mutate(() => markContentCalendarItemPublished(item.id, locale))}><Send size={14} />{t("contentCalendar.markPublished")}</button>
          <button type="button" className="button-secondary" disabled={mutating} onClick={() => mutate(() => cancelContentCalendarItem(item.id, locale))}><X size={14} />{t("contentCalendar.cancel")}</button>
          <button type="button" className="button-secondary" disabled={mutating} onClick={() => mutate(() => archiveContentCalendarItem(item.id, locale))}><Archive size={14} />{t("contentCalendar.archive")}</button>
        </div>
      </div>
      <ContentCalendarFormFields item={item} options={options} />
      {(state.error || clientError) && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} />{state.error || clientError}</div>}
      {state.success && <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 sm:col-span-2"><CheckCircle2 size={15} />{t("common.save")}</div>}
      <div className="flex justify-end border-t border-white/[.06] pt-4 sm:col-span-2">
        <button className="button-primary" disabled={pending || mutating}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
      </div>
    </form>

    {item.copy_item && <section className="metal-card p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">{t("contentCalendar.linkedCopy")}</p><Link href={`/copy/${item.copy_item.id}`} className="font-display text-xl uppercase text-white hover:text-zinc-200">{item.copy_item.title}</Link></div>
        <CopyClipboardButton body={item.copy_item.body} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-500">{item.copy_item.body}</p>
    </section>}

    {canDelete && <section className="metal-card flex flex-wrap items-center justify-between gap-3 border-red-500/10 p-5">
      <div>
        <p className="font-display text-sm uppercase tracking-wider text-red-300">{t("copy.dangerZone")}</p>
        <p className="mt-2 text-xs text-zinc-600">{t("contentCalendar.deleteConfirm")}</p>
      </div>
      <button type="button" className="button-secondary border-red-500/20 text-red-300 hover:bg-red-500/10" disabled={mutating || pending} onClick={remove}>
        {mutating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{t("contentCalendar.delete")}
      </button>
    </section>}
  </div>;
}

export function RelatedContentCalendarPanel({
  title,
  createLabel,
  items,
  options,
  defaults,
}: {
  title: string;
  createLabel: string;
  items: ContentCalendarItem[];
  options: ContentCalendarOptions;
  defaults: Partial<Pick<ContentCalendarItem, "copy_item_id" | "event_id" | "album_id" | "song_id" | "epk_id" | "channel" | "content_type">>;
}) {
  const { locale, t } = useI18n();
  return <section className="metal-card p-5 sm:p-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg uppercase text-white">{title}</h2>
      <ContentCalendarCreateButton options={options} defaults={defaults} label={createLabel} />
    </div>
    <div className="space-y-3">
      {items.slice(0, 3).map((item) => <Link key={item.id} href={`/content-calendar/${item.id}`} className="block rounded-lg border border-white/[.06] p-3 transition hover:border-white/15">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-medium text-zinc-200">{item.title}</p>
          <CalendarBadge status={item.status} />
        </div>
        <p className="mt-2 text-xs text-zinc-600">{item.scheduled_at ? formatDate(item.scheduled_at, true, locale) : t("contentCalendar.noDate")}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[.14em] text-zinc-700">{translateEnum(locale, item.channel)} · {translateEnum(locale, item.content_type)}</p>
      </Link>)}
      {!items.length && <p className="py-5 text-center text-sm text-zinc-600">{t("contentCalendar.noItems")}</p>}
    </div>
    <Link href="/content-calendar" className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white">{t("contentCalendar.openCalendar")}<ExternalLink size={12} /></Link>
  </section>;
}
