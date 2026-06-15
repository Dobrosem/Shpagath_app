"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  AlertCircle, CheckCircle2, Disc3, ImageIcon, Loader2, Pencil,
  Plus, Save, Trash2, Upload, X,
} from "lucide-react";
import {
  assignSongToAlbum,
  createAlbum,
  deleteAlbum,
  removeSongFromAlbum,
  updateAlbum,
  updateAlbumCover,
  updateSongTrackNumber,
} from "@/app/actions";
import { translateEnum } from "@/lib/i18n";
import type { ActionState, Album, Song } from "@/lib/types";
import { formatDate, getAlbumCoverUrl } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { StatusBadge } from "./ui";

const initialState: ActionState = { success: false, error: null };
const albumTypes = ["album", "ep", "single", "live", "demo", "compilation"];
const albumStatuses = ["draft", "in_progress", "review", "approved", "released", "archived"];
const coverStatuses = ["draft", "review", "approved", "outdated", "archived"];

function AlbumFields({ album, includeCover = true }: { album?: Album; includeCover?: boolean }) {
  const { locale } = useI18n();
  const label = (ru: string, en: string) => locale === "en" ? en : ru;
  return <>
    <label><span className="label">{label("Название", "Title")}</span><input className="field" name="title" required defaultValue={album?.title ?? ""} /></label>
    <label><span className="label">{label("Тип", "Type")}</span>
      <select className="field" name="type" defaultValue={album?.type ?? "album"}>
        {albumTypes.map((type) => <option key={type} value={type}>{translateEnum(locale, type)}</option>)}
      </select>
    </label>
    <label><span className="label">{label("Статус", "Status")}</span>
      <select className="field" name="status" defaultValue={album?.status ?? "draft"}>
        {albumStatuses.map((status) => <option key={status} value={status}>{translateEnum(locale, status, status, "album")}</option>)}
      </select>
    </label>
    <label><span className="label">{label("Дата релиза", "Release date")}</span><input className="field" type="date" name="release_date" defaultValue={album?.release_date ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{label("Описание", "Description")}</span><textarea className="field min-h-28 py-3" name="description" defaultValue={album?.description ?? ""} /></label>
    {includeCover && <>
      <label className="sm:col-span-2"><span className="label">{label("Ссылка на обложку", "Cover URL")}</span><input className="field" type="url" name="cover_image_url" defaultValue={album?.cover_image_url ?? ""} /></label>
      <label><span className="label">{label("Статус обложки", "Cover status")}</span><select className="field" name="cover_status" defaultValue={album?.cover_status ?? "draft"}>{coverStatuses.map((status) => <option key={status} value={status}>{translateEnum(locale, status)}</option>)}</select></label>
      <label className="sm:col-span-2"><span className="label">{label("Заметки к обложке", "Cover notes")}</span><textarea className="field min-h-20 py-3" name="cover_notes" defaultValue={album?.cover_notes ?? ""} /></label>
    </>}
  </>;
}

export function AlbumCreateDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(createAlbum, initialState);
  useEffect(() => {
    if (!state.success || !state.id) return;
    setOpen(false);
    router.push(`/albums/${state.id}`);
    router.refresh();
  }, [router, state]);

  return <>
    <button type="button" className="button-primary" onClick={() => setOpen(true)}><Plus size={15} />{t("albums.create")}</button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("albums.release")}</p><h2 className="font-display text-2xl uppercase text-white">{t("albums.create")}</h2></div>
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <AlbumFields />
          {state.error && <p className="flex gap-2 text-xs text-red-300 sm:col-span-2"><AlertCircle size={14} />{state.error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("albums.create")}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}

export function AlbumEditDialog({
  album,
  canDelete = false,
  triggerClassName = "button-secondary",
}: {
  album: Album;
  canDelete?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(updateAlbum.bind(null, album.id), initialState);
  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    router.refresh();
  }, [router, state.success]);

  return <>
    <button type="button" className={triggerClassName} onClick={() => setOpen(true)}><Pencil size={14} />{t("albums.edit")}</button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase text-white">{t("albums.edit")}</h2>
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="cover_image_url" value={album.cover_image_url ?? ""} />
          <input type="hidden" name="cover_status" value={album.cover_status} />
          <input type="hidden" name="cover_notes" value={album.cover_notes ?? ""} />
          <AlbumFields album={album} includeCover={false} />
          {state.error && <p className="flex gap-2 text-xs text-red-300 sm:col-span-2"><AlertCircle size={14} />{state.error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
          </div>
        </form>
        <AlbumCoverEditor album={album} embedded />
        {canDelete && <div className="mt-6 border-t border-white/[.08] pt-5">
          <AlbumDeleteButton album={album} />
        </div>}
      </div>
    </div>}
  </>;
}

export function AlbumCard({ album }: { album: Album }) {
  const { locale } = useI18n();
  const coverUrl = getAlbumCoverUrl(album);
  return <Link href={`/albums/${album.id}`} className="metal-card group overflow-hidden transition hover:border-white/15">
    <div className="relative aspect-square overflow-hidden bg-zinc-950">
      {coverUrl
        ? <img src={coverUrl} alt={album.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,.07),transparent_70%)]"><Disc3 size={48} className="text-zinc-800" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
      <div className="absolute inset-x-4 bottom-4">
        <StatusBadge status={album.status} context="album" />
        <h2 className="mt-3 font-display text-xl uppercase text-white">{album.title}</h2>
      </div>
    </div>
    <div className="flex items-center justify-between gap-3 p-4 text-xs text-zinc-600">
      <span>{translateEnum(locale, album.type)}</span>
      <span>{album.release_date ? formatDate(album.release_date, false, locale) : "—"} · {album.songs_count ?? 0}</span>
    </div>
  </Link>;
}

export function AlbumCoverEditor({ album, embedded = false }: { album: Album; embedded?: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(updateAlbumCover.bind(null, album.id), initialState);
  const coverUrl = getAlbumCoverUrl(album);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  if (embedded) return <section className="mt-7 border-t border-white/[.08] pt-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="eyebrow">{t("albums.cover")}</p>
        <h3 className="font-display text-xl uppercase text-white">{t("albums.editCover")}</h3>
      </div>
      <StatusBadge status={album.cover_status} />
    </div>
    <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
      <div className="aspect-square overflow-hidden rounded-xl border border-white/[.08] bg-black/30">
        {coverUrl
          ? <img src={coverUrl} alt={album.title} className="h-full w-full object-cover" />
          : <div className="grid h-full place-items-center"><ImageIcon className="text-zinc-700" size={30} /></div>}
      </div>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="locale" value={locale} />
        <label><span className="label">{coverUrl ? t("albums.replaceCover") : t("albums.uploadCover")}</span><input className="field py-2" type="file" name="cover_file" accept="image/*" /></label>
        <label><span className="label">URL</span><input className="field" type="url" name="cover_image_url" defaultValue={album.cover_image_url ?? ""} /></label>
        <label><span className="label">{t("albums.coverStatus")}</span><select className="field" name="cover_status" defaultValue={album.cover_status}>{coverStatuses.map((status) => <option key={status} value={status}>{translateEnum(locale, status)}</option>)}</select></label>
        <label><span className="label">{t("albums.coverNotes")}</span><textarea className="field min-h-20 py-3" name="cover_notes" defaultValue={album.cover_notes ?? ""} /></label>
        {state.error && <p className="flex gap-2 text-xs text-red-300"><AlertCircle size={14} />{state.error}</p>}
        {state.success && <p className="flex gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} />{t("albums.saved")}</p>}
        <div className="flex flex-wrap justify-between gap-2">
          {album.cover_image_url && <button className="button-secondary border-red-500/20 text-red-300" name="remove_cover" value="true" disabled={pending}><Trash2 size={14} />{t("albums.removeCover")}</button>}
          <button className="button-primary ml-auto" disabled={pending}>{pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{coverUrl ? t("albums.replaceCover") : t("albums.uploadCover")}</button>
        </div>
      </form>
    </div>
  </section>;

  return <div className="grid gap-5 lg:grid-cols-[minmax(260px,.8fr)_1.2fr]">
    <div className="metal-card overflow-hidden">
      {coverUrl
        ? <img src={coverUrl} alt={album.title} className="aspect-square w-full object-cover" />
        : <div className="grid aspect-square place-items-center text-center"><div><ImageIcon className="mx-auto text-zinc-700" size={42} /><p className="mt-4 text-sm text-zinc-600">{t("albums.coverEmpty")}</p></div></div>}
      <div className="border-t border-white/[.06] p-5">
        <div className="flex items-center justify-between gap-3"><span className="font-display uppercase text-white">{t("albums.cover")}</span><StatusBadge status={album.cover_status} /></div>
        {album.cover_notes && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-500">{album.cover_notes}</p>}
      </div>
    </div>
    <form action={action} className="metal-card grid content-start gap-4 p-6">
      <input type="hidden" name="locale" value={locale} />
      <label><span className="label">{coverUrl ? t("albums.replaceCover") : t("albums.uploadCover")}</span><input className="field py-2" type="file" name="cover_file" accept="image/*" /></label>
      <label><span className="label">URL</span><input className="field" type="url" name="cover_image_url" defaultValue={album.cover_image_url ?? ""} /></label>
      <label><span className="label">{t("albums.coverStatus")}</span><select className="field" name="cover_status" defaultValue={album.cover_status}>{coverStatuses.map((status) => <option key={status} value={status}>{translateEnum(locale, status)}</option>)}</select></label>
      <label><span className="label">{t("albums.coverNotes")}</span><textarea className="field min-h-28 py-3" name="cover_notes" defaultValue={album.cover_notes ?? ""} /></label>
      {state.error && <p className="flex gap-2 text-xs text-red-300"><AlertCircle size={14} />{state.error}</p>}
      {state.success && <p className="flex gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} />{t("albums.saved")}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        {album.cover_image_url && <button className="button-secondary border-red-500/20 text-red-300" name="remove_cover" value="true" disabled={pending}><Trash2 size={14} />{t("albums.removeCover")}</button>}
        <button className="button-primary ml-auto" disabled={pending}>{pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{coverUrl ? t("albums.replaceCover") : t("albums.uploadCover")}</button>
      </div>
    </form>
  </div>;
}

function AlbumSongRow({ album, song }: { album: Album; song: Song }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [trackNumber, setTrackNumber] = useState(String(song.track_number ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function saveTrack() {
    startTransition(async () => {
      const result = await updateSongTrackNumber(song.id, album.id, Number(trackNumber), locale);
      setError(result.error);
      if (result.success) router.refresh();
    });
  }
  function remove() {
    startTransition(async () => {
      const result = await removeSongFromAlbum(song.id, album.id, locale);
      setError(result.error);
      if (result.success) router.refresh();
    });
  }
  return <div className="grid gap-3 border-b border-white/[.06] p-4 last:border-0 sm:grid-cols-[52px_1fr_130px_auto] sm:items-center">
    <span className="font-display text-xl text-zinc-700">{song.track_number ? String(song.track_number).padStart(2, "0") : "—"}</span>
    <Link href={`/songs/${song.id}`} className="min-w-0 truncate text-sm text-zinc-200 hover:text-white">{song.title}</Link>
    <input className="field" type="number" min="1" value={trackNumber} onChange={(event) => setTrackNumber(event.target.value)} aria-label={t("albums.trackNumber")} />
    <div className="flex gap-2">
      <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-zinc-500 hover:text-white" onClick={saveTrack} disabled={pending} title={t("common.save")}><Save size={15} /></button>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-red-500/15 text-zinc-600 hover:text-red-300" onClick={remove} disabled={pending} title={t("albums.removeSong")}><X size={16} /></button>
    </div>
    {error && <p className="text-xs text-red-300 sm:col-span-4">{error}</p>}
  </div>;
}

export function AlbumSongsManager({ album, availableSongs, readOnly = false }: { album: Album; availableSongs: Song[]; readOnly?: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const songId = String(formData.get("song_id") ?? "");
    return assignSongToAlbum(songId, previous, formData);
  }, initialState);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return <section className="metal-card overflow-hidden">
    <div className="border-b border-white/[.06] p-5">
      <h2 className="font-display text-xl uppercase text-white">{t("albums.songs")}</h2>
    </div>
    {(album.songs ?? []).map((song) => readOnly
      ? <Link key={song.id} href={`/songs/${song.id}`} className="flex items-center gap-4 border-b border-white/[.06] p-4 text-sm text-zinc-300 hover:bg-white/[.02] hover:text-white"><span className="w-8 font-display text-zinc-700">{song.track_number ? String(song.track_number).padStart(2, "0") : "—"}</span>{song.title}</Link>
      : <AlbumSongRow key={song.id} album={album} song={song} />)}
    {!album.songs?.length && <p className="p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
    {!readOnly && <form action={action} className="grid gap-3 border-t border-white/[.06] bg-white/[.015] p-5 sm:grid-cols-[1fr_130px_auto]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="album_id" value={album.id} />
      <select className="field" name="song_id" required defaultValue="">
        <option value="">{t("albums.addSong")}</option>
        {availableSongs.map((song) => <option key={song.id} value={song.id}>{song.title}</option>)}
      </select>
      <input className="field" type="number" min="1" name="track_number" placeholder={t("albums.trackNumber")} />
      <button className="button-primary" disabled={pending || !availableSongs.length}>{pending && <Loader2 size={14} className="animate-spin" />}<Plus size={14} />{t("common.add")}</button>
      {!availableSongs.length && <p className="text-xs text-zinc-600 sm:col-span-3">{t("albums.noSongsAvailable")}</p>}
      {state.error && <p className="text-xs text-red-300 sm:col-span-3">{state.error}</p>}
    </form>}
  </section>;
}

export function AlbumDeleteButton({ album }: { album: Album }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!window.confirm(`${t("albums.deleteWarning")}\n\n${t("albums.delete")}?`)) return;
    startTransition(async () => {
      const result = await deleteAlbum(album.id, locale);
      setError(result.error);
      if (result.success) {
        router.push("/albums");
        router.refresh();
      }
    });
  }
  return <div>
    <button type="button" className="button-secondary border-red-500/20 text-red-300" disabled={pending} onClick={remove}>{pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{t("albums.delete")}</button>
    {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
  </div>;
}

export function SongAlbumEditor({ song, albums }: { song: Song; albums: Album[] }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(assignSongToAlbum.bind(null, song.id), initialState);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  return <form action={action} className="metal-card mt-5 grid gap-4 p-6 sm:grid-cols-[1fr_150px_auto] sm:items-end">
    <input type="hidden" name="locale" value={locale} />
    <label><span className="label">{t("albums.current")}</span><select className="field" name="album_id" defaultValue={song.album_id ?? ""}><option value="">{t("albums.withoutAlbum")}</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title} · {translateEnum(locale, album.type)}</option>)}</select></label>
    <label><span className="label">{t("albums.trackNumber")}</span><input className="field" type="number" min="1" name="track_number" defaultValue={song.track_number ?? ""} /></label>
    <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
    {state.error && <p className="text-xs text-red-300 sm:col-span-3">{state.error}</p>}
  </form>;
}
