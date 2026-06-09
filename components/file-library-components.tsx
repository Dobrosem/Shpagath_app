"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Archive, CheckCircle2, Download, ExternalLink, FileArchive, FileAudio2, FileImage, FilePlus2, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import {
  archiveFileRecord,
  createFileRecord,
  deleteFileRecord,
  replaceFileInLibrary,
  updateFileRecord,
  assignEventTechRider,
} from "@/app/actions";
import { translateEnum } from "@/lib/i18n";
import type { ActionState, Album, ContentCalendarItem, CopyItem, EpkProfile, Event, FileRecord, FileStatus, FileType, Song } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { StatusBadge } from "./ui";

const initialState: ActionState = { success: false, error: null };
const fileTypes: FileType[] = [
  "tech_rider", "stage_plot", "light_timing", "video_timing", "press_photo", "logo",
  "artwork", "lyrics", "guitar_tab", "bass_tab", "orchestral_score", "orchestral_parts",
  "backing_track", "click_track", "stems", "reaper_project", "contract", "invoice",
  "document", "image", "audio", "video", "other",
];
const statuses: FileStatus[] = ["active", "draft", "review", "approved", "archived"];

export type FileLibraryOptions = {
  events: Pick<Event, "id" | "title">[];
  albums: Pick<Album, "id" | "title">[];
  songs: Pick<Song, "id" | "title">[];
  epks: Pick<EpkProfile, "id" | "title">[];
  copyItems: Pick<CopyItem, "id" | "title">[];
  contentItems: Pick<ContentCalendarItem, "id" | "title">[];
};

export type FileLibraryDefaults = Partial<Pick<FileRecord, "event_id" | "album_id" | "song_id" | "epk_id" | "copy_item_id" | "content_calendar_item_id" | "file_type" | "status">>;

export function formatBytes(value?: number | null) {
  if (!value || value < 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function FileIcon({ file }: { file: Pick<FileRecord, "file_type" | "mime_type" | "status"> }) {
  const type = file.mime_type ?? file.file_type;
  const archived = file.status === "archived";
  const className = cn("text-zinc-500", archived && "text-zinc-700");
  if (type.includes("image") || ["press_photo", "logo", "artwork", "image"].includes(file.file_type)) return <FileImage size={18} className={className} />;
  if (type.includes("audio") || ["backing_track", "click_track", "stems", "audio"].includes(file.file_type)) return <FileAudio2 size={18} className={className} />;
  if (archived) return <FileArchive size={18} className={className} />;
  return <FileText size={18} className={className} />;
}

function relationLabels(file: FileRecord, t: ReturnType<typeof useI18n>["t"]) {
  return [
    file.event && `${t("copy.event")}: ${file.event.title}`,
    file.album && `${t("copy.album")}: ${file.album.title}`,
    file.song && `${t("copy.song")}: ${file.song.title}`,
    file.epk && `EPK: ${file.epk.title}`,
    file.copy_item && `${t("contentCalendar.linkedCopy")}: ${file.copy_item.title}`,
    file.content_calendar_item && `${t("nav.contentCalendar")}: ${file.content_calendar_item.title}`,
  ].filter(Boolean) as string[];
}

function FileFormFields({
  item,
  options,
  defaults,
  includeUpload,
  allowedTypes,
  showRelations = true,
}: {
  item?: FileRecord;
  options: FileLibraryOptions;
  defaults?: FileLibraryDefaults;
  includeUpload?: boolean;
  allowedTypes?: FileType[];
  showRelations?: boolean;
}) {
  const { locale, t } = useI18n();
  const availableTypes = allowedTypes?.length ? allowedTypes : fileTypes;
  const selected = {
    event_id: item?.event_id ?? defaults?.event_id ?? "",
    album_id: item?.album_id ?? defaults?.album_id ?? "",
    song_id: item?.song_id ?? defaults?.song_id ?? "",
    epk_id: item?.epk_id ?? defaults?.epk_id ?? "",
    copy_item_id: item?.copy_item_id ?? defaults?.copy_item_id ?? "",
    content_calendar_item_id: item?.content_calendar_item_id ?? defaults?.content_calendar_item_id ?? "",
  };
  return <>
    <input type="hidden" name="locale" value={locale} />
    <label className="sm:col-span-2"><span className="label">{t("contentCalendar.title")}</span><input name="title" className="field" required defaultValue={item?.title ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{t("contentCalendar.description")}</span><textarea name="description" className="field min-h-24 resize-y py-3" defaultValue={item?.description ?? ""} /></label>
    <label><span className="label">{t("files.fileType")}</span><select name="file_type" className="field" defaultValue={item?.file_type ?? defaults?.file_type ?? availableTypes[0] ?? "other"}>{availableTypes.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}</select></label>
    <label><span className="label">{t("contentCalendar.status")}</span><select name="status" className="field" defaultValue={item?.status ?? defaults?.status ?? "active"}>{statuses.map((value) => <option key={value} value={value}>{translateEnum(locale, value)}</option>)}</select></label>
    {includeUpload && <label className="sm:col-span-2"><span className="label">{t("files.upload")}</span><input name="file" type="file" className="field file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-zinc-200" /></label>}
    <label className="sm:col-span-2"><span className="label">{t("files.externalUrl")}</span><input name="external_url" type="url" className="field" defaultValue={item?.external_url ?? ""} /></label>
    <label className="inline-flex items-center gap-2 text-sm text-zinc-500 sm:col-span-2"><input name="is_public" type="checkbox" defaultChecked={item?.is_public ?? false} className="h-4 w-4 rounded border-white/10 bg-zinc-950" />{t("files.publicFlag")}</label>
    {!showRelations && Object.entries(selected).map(([key, value]) => <input key={key} type="hidden" name={key} value={value ?? ""} />)}
    {showRelations && <><label><span className="label">{t("copy.event")}</span><select name="event_id" className="field" defaultValue={selected.event_id}><option value="">{t("common.select")}</option>{options.events.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("copy.album")}</span><select name="album_id" className="field" defaultValue={selected.album_id}><option value="">{t("common.select")}</option>{options.albums.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("copy.song")}</span><select name="song_id" className="field" defaultValue={selected.song_id}><option value="">{t("common.select")}</option>{options.songs.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">EPK</span><select name="epk_id" className="field" defaultValue={selected.epk_id}><option value="">{t("common.select")}</option>{options.epks.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("contentCalendar.linkedCopy")}</span><select name="copy_item_id" className="field" defaultValue={selected.copy_item_id}><option value="">{t("common.select")}</option>{options.copyItems.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
    <label><span className="label">{t("nav.contentCalendar")}</span><select name="content_calendar_item_id" className="field" defaultValue={selected.content_calendar_item_id}><option value="">{t("common.select")}</option>{options.contentItems.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label></>}
  </>;
}

export function FileCreateButton({
  options,
  defaults,
  label,
  allowedTypes,
  showRelations,
  stayOnPage,
}: {
  options: FileLibraryOptions;
  defaults?: FileLibraryDefaults;
  label?: string;
  allowedTypes?: FileType[];
  showRelations?: boolean;
  stayOnPage?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createFileRecord, initialState);

  useEffect(() => {
    if (!state.success || !state.id) return;
    setOpen(false);
    if (stayOnPage) router.refresh();
    else router.push(`/files/${state.id}`);
  }, [router, state, stayOnPage]);

  return <>
    <button type="button" className="button-primary" onClick={() => setOpen(true)}><FilePlus2 size={15} />{label ?? t("files.add")}</button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("files.library")}</p><h2 className="font-display text-2xl uppercase text-white">{t("files.add")}</h2></div>
          <button type="button" className="text-zinc-600 hover:text-white" aria-label={t("common.close")} onClick={() => setOpen(false)}><X /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <FileFormFields options={options} defaults={defaults} includeUpload allowedTypes={allowedTypes} showRelations={showRelations} />
          <p className="text-xs leading-5 text-zinc-600 sm:col-span-2">{t("files.largeExternalHint")}</p>
          {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} />{state.error}</div>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("files.upload")}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}

export function FileCard({ file }: { file: FileRecord }) {
  const { locale, t } = useI18n();
  const url = file.display_url ?? file.external_url ?? file.public_url;
  const relations = relationLabels(file, t);
  return <article className="metal-card p-5 transition hover:border-white/15">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[.035]"><FileIcon file={file} /></div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">{translateEnum(locale, file.file_type)}</p>
          <Link href={`/files/${file.id}`} className="mt-1 block font-display text-xl uppercase text-white hover:text-zinc-200">{file.title}</Link>
        </div>
      </div>
      <StatusBadge status={file.status} />
    </div>
    {file.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">{file.description}</p>}
    <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[.12em] text-zinc-700">
      <span>{file.mime_type || t("files.externalUrl")}</span>
      <span>{formatBytes(file.size_bytes)}</span>
    </div>
    {!!relations.length && <p className="mt-3 line-clamp-2 text-xs text-zinc-600">{relations.join(" · ")}</p>}
    <div className="mt-5 flex flex-wrap gap-2">
      <Link href={`/files/${file.id}`} className="button-secondary min-h-9 px-3 text-xs">{t("common.open")}</Link>
      {url && <a href={url} target="_blank" rel="noreferrer" className="button-secondary min-h-9 px-3 text-xs"><Download size={13} />{t("files.download")}</a>}
    </div>
  </article>;
}

export function FileEditor({ file, options, canDelete }: { file: FileRecord; options: FileLibraryOptions; canDelete: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(updateFileRecord.bind(null, file.id), initialState);
  const [replaceState, replaceAction, replacing] = useActionState(replaceFileInLibrary.bind(null, file.id), initialState);
  const [mutating, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);
  const url = file.display_url ?? file.external_url ?? file.public_url;
  const relations = relationLabels(file, t);

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
    if (!window.confirm(t("files.deleteConfirm"))) return;
    mutate(() => deleteFileRecord(file.id, locale), () => router.push("/files"));
  }

  return <div className="space-y-5">
    <section className="metal-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{t("files.library")}</p>
          <h2 className="font-display text-xl uppercase text-white">{t("files.open")}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {url && <a href={url} target="_blank" rel="noreferrer" className="button-primary"><ExternalLink size={14} />{t("files.open")}</a>}
          <button type="button" className="button-secondary" disabled={mutating} onClick={() => mutate(() => archiveFileRecord(file.id, locale))}><Archive size={14} />{t("files.archive")}</button>
        </div>
      </div>
      <dl className="grid gap-x-6 sm:grid-cols-2">
        <div className="border-b border-white/[.06] py-2.5"><dt className="label">{t("files.fileType")}</dt><dd className="mt-1 text-sm text-zinc-300">{translateEnum(locale, file.file_type)}</dd></div>
        <div className="border-b border-white/[.06] py-2.5"><dt className="label">{t("contentCalendar.status")}</dt><dd className="mt-1"><StatusBadge status={file.status} /></dd></div>
        <div className="border-b border-white/[.06] py-2.5"><dt className="label">{t("files.fileSize")}</dt><dd className="mt-1 text-sm text-zinc-300">{formatBytes(file.size_bytes)}</dd></div>
        <div className="border-b border-white/[.06] py-2.5"><dt className="label">{t("files.mimeType")}</dt><dd className="mt-1 text-sm text-zinc-300">{file.mime_type || "—"}</dd></div>
        <div className="border-b border-white/[.06] py-2.5"><dt className="label">{t("files.storagePath")}</dt><dd className="mt-1 break-all text-sm text-zinc-300">{file.storage_path || file.external_url || file.public_url || "—"}</dd></div>
        <div className="border-b border-white/[.06] py-2.5"><dt className="label">{t("files.createdAt")}</dt><dd className="mt-1 text-sm text-zinc-300">{formatDate(file.created_at, true, locale)}</dd></div>
      </dl>
      {!!relations.length && <p className="mt-4 text-xs text-zinc-600">{relations.join(" · ")}</p>}
    </section>

    <form action={action} className="metal-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2"><p className="eyebrow">{t("files.edit")}</p><h2 className="font-display text-xl uppercase text-white">{file.title}</h2></div>
      <FileFormFields item={file} options={options} />
      {(state.error || clientError) && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} />{state.error || clientError}</div>}
      {state.success && <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 sm:col-span-2"><CheckCircle2 size={15} />{t("common.save")}</div>}
      <div className="flex justify-end border-t border-white/[.06] pt-4 sm:col-span-2">
        <button className="button-primary" disabled={pending || mutating}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
      </div>
    </form>

    <form action={replaceAction} className="metal-card flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-6">
      <input type="hidden" name="locale" value={locale} />
      <label className="min-w-0 flex-1"><span className="label">{t("files.replace")}</span><input name="file" type="file" className="field file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-zinc-200" /></label>
      <button className="button-secondary" disabled={replacing}>{replacing && <Loader2 size={14} className="animate-spin" />}<Upload size={14} />{t("files.replace")}</button>
      {replaceState.error && <p className="text-xs text-red-300">{replaceState.error}</p>}
      {replaceState.success && <p className="text-xs text-emerald-300">{t("common.save")}</p>}
    </form>

    {canDelete && <section className="metal-card flex flex-wrap items-center justify-between gap-3 border-red-500/10 p-5">
      <div>
        <p className="font-display text-sm uppercase tracking-wider text-red-300">{t("copy.dangerZone")}</p>
        <p className="mt-2 text-xs text-zinc-600">{t("files.deleteConfirm")}</p>
      </div>
      <button type="button" className="button-secondary border-red-500/20 text-red-300 hover:bg-red-500/10" disabled={mutating || pending || replacing} onClick={remove}>
        {mutating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{t("files.delete")}
      </button>
    </section>}
  </div>;
}

export function RelatedFilesPanel({
  title,
  items,
  options,
  defaults,
  canCreate = true,
  allowedTypes,
}: {
  title: string;
  items: FileRecord[];
  options: FileLibraryOptions;
  defaults: FileLibraryDefaults;
  canCreate?: boolean;
  allowedTypes?: FileType[];
}) {
  const { locale, t } = useI18n();
  return <section className="metal-card p-5 sm:p-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg uppercase text-white">{title}</h2>
      {canCreate && <FileCreateButton options={options} defaults={defaults} label={t("files.upload")} allowedTypes={allowedTypes} showRelations={false} stayOnPage />}
    </div>
    <div className="space-y-3">
      {items.slice(0, 5).map((file) => <div key={file.id} className="flex items-center gap-3 rounded-lg border border-white/[.06] p-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[.035]"><FileIcon file={file} /></div>
        <Link href={`/files/${file.id}`} className="min-w-0 flex-1">
          <span className="block truncate text-sm text-zinc-200">{file.title}</span>
          <span className="mt-1 block text-[10px] uppercase tracking-[.14em] text-zinc-700">{translateEnum(locale, file.file_type)} · {translateEnum(locale, file.status)}</span>
        </Link>
        {(file.display_url || file.external_url || file.public_url) && <a href={file.display_url ?? file.external_url ?? file.public_url ?? undefined} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-white" aria-label={t("files.open")} title={t("files.open")}><ExternalLink size={14} /></a>}
      </div>)}
      {!items.length && <p className="py-5 text-center text-sm text-zinc-600">{t("files.empty")}</p>}
    </div>
  </section>;
}

function SharedTechRiderRow({ file }: { file: FileRecord }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [replaceState, replaceAction, replacing] = useActionState(replaceFileInLibrary.bind(null, file.id), initialState);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiving, startArchiving] = useTransition();
  const url = file.display_url ?? file.external_url ?? file.public_url;

  useEffect(() => {
    if (!replaceState.success) return;
    router.refresh();
  }, [replaceState.success, router]);

  function archive() {
    setArchiveError(null);
    startArchiving(async () => {
      const result = await archiveFileRecord(file.id, locale);
      if (result.error) {
        setArchiveError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return <div className="rounded-lg border border-white/[.06] p-3">
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[.035]"><FileIcon file={file} /></div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm text-zinc-200">{file.title}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-zinc-700">{translateEnum(locale, file.status)} · {formatBytes(file.size_bytes)}</p>
      </div>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {url && <a href={url} target="_blank" rel="noreferrer" className="button-secondary min-h-9 w-full px-3 text-xs"><ExternalLink size={13} />{t("files.open")}</a>}
      <button type="button" className="button-secondary min-h-9 w-full px-3 text-xs" disabled={archiving || replacing} onClick={archive}>
        {archiving ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}{t("files.archive")}
      </button>
    </div>
    <form action={replaceAction} className="mt-4 grid gap-2 border-t border-white/[.06] pt-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="min-w-0"><span className="label">{t("files.replace")}</span><input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,image/png,image/jpeg,image/webp,image/svg+xml,text/plain" className="field w-full file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-zinc-200" /></label>
      <button className="button-secondary min-h-10 w-full" disabled={replacing || archiving}>{replacing && <Loader2 size={14} className="animate-spin" />}<Upload size={14} />{t("files.replace")}</button>
      {(replaceState.error || archiveError) && <p className="text-xs text-red-300">{replaceState.error || archiveError}</p>}
      {replaceState.success && <p className="text-xs text-emerald-300">{t("common.save")}</p>}
    </form>
  </div>;
}

export function SharedDocumentsPanel({
  techRiders,
  options,
  epkId,
  canCreate = true,
}: {
  techRiders: FileRecord[];
  options: FileLibraryOptions;
  epkId?: string;
  canCreate?: boolean;
}) {
  const { locale, t } = useI18n();
  return <section className="metal-card p-5 sm:p-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-display text-lg uppercase text-white">{t("files.sharedDocuments")}</h2>
        <p className="mt-2 text-xs text-zinc-600">{t("files.sharedTechnicalRider")}</p>
      </div>
      {canCreate && <FileCreateButton
        options={options}
        defaults={{ epk_id: epkId, file_type: "tech_rider", status: "active" }}
        label={t("files.uploadNewRider")}
        allowedTypes={["tech_rider"]}
        showRelations={false}
        stayOnPage
      />}
    </div>
    <div className="space-y-3">
      {techRiders.map((file) => <SharedTechRiderRow key={file.id} file={file} />)}
      {!techRiders.length && <p className="py-5 text-center text-sm text-zinc-600">{t("files.noRiderSelected")}</p>}
    </div>
  </section>;
}

export function EventTechRiderSelector({
  event,
  riders,
  selectedRider,
  canEdit,
}: {
  event: Event;
  riders: FileRecord[];
  selectedRider?: FileRecord | null;
  canEdit: boolean;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(assignEventTechRider.bind(null, event.id), initialState);
  const selectedUrl = selectedRider?.display_url ?? selectedRider?.external_url ?? selectedRider?.public_url ?? event.tech_rider_url ?? null;

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  return <section className="metal-card p-5 sm:p-6">
    <h2 className="font-display text-lg uppercase text-white">{translateEnum(locale, "tech_rider")}</h2>
    <p className="mt-2 text-xs leading-5 text-zinc-600">{t("files.sharedTechnicalRider")}</p>
    <div className="mt-4 rounded-lg border border-white/[.06] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-zinc-200">{selectedRider?.title ?? t("files.noRiderSelected")}</p>
          <p className="mt-1 text-xs text-zinc-600">{selectedRider ? translateEnum(locale, selectedRider.status) : event.tech_rider_url || t("common.noData")}</p>
        </div>
        {selectedUrl && <a href={selectedUrl} target="_blank" rel="noreferrer" className="button-secondary min-h-9 px-3 text-xs"><ExternalLink size={13} />{t("files.open")}</a>}
      </div>
      {canEdit && <form action={action} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
        <input type="hidden" name="locale" value={locale} />
        <label><span className="label">{t("files.selectTechnicalRider")}</span>
          <select name="tech_rider_file_id" className="field" defaultValue={event.tech_rider_file_id ?? ""}>
            <option value="">{t("files.noRiderSelected")}</option>
            {riders.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}
          </select>
        </label>
        <button className="button-primary min-h-10" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("files.useThisRider")}</button>
        {state.error && <p className="text-xs text-red-300 md:col-span-2">{state.error}</p>}
        {state.success && <p className="text-xs text-emerald-300 md:col-span-2">{t("common.save")}</p>}
      </form>}
      <div className="mt-4 space-y-1 border-t border-white/[.06] pt-3 text-xs text-zinc-600">
        <p>{t("files.stagePlotExternalHint")}</p>
        <p>{t("files.lightTimingExternalHint")}</p>
        <p>{t("files.videoTimingExternalHint")}</p>
      </div>
    </div>
  </section>;
}
