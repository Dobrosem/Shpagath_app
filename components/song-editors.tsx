"use client";

import { AlertCircle, CheckCircle2, ImageIcon, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSong,
  deleteSongMaterial,
  updateSong,
  updateSongCover,
  updateSongMaterial,
} from "@/app/actions";
import { translateEnum } from "@/lib/i18n";
import type { ActionState, Material, Song } from "@/lib/types";
import { formatDuration, getSongDisplayCover } from "@/lib/utils";
import { StatusBadge } from "./ui";
import { useI18n } from "./i18n-provider";

const initialState: ActionState = { success: false, error: null };
const songStatuses = [
  "idea", "demo", "arrangement", "recording", "mixing",
  "mastering", "ready", "live_ready", "archived",
];
const materialStatuses = ["draft", "active", "approved", "outdated", "archived"];
const coverStatuses = ["draft", "review", "approved", "outdated", "archived"] as const;

function ResultMessage({ state, successText }: { state: ActionState; successText?: string }) {
  const { t } = useI18n();
  if (state.error) return <p className="flex items-start gap-2 text-xs text-red-300"><AlertCircle size={14} />{state.error}</p>;
  if (state.success) return <p className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} />{successText ?? t("songEdit.saved")}</p>;
  return null;
}

export function SongOverviewEditor({ song }: { song: Song }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateSong.bind(null, song.id), initialState);
  useEffect(() => {
    if (!state.success) return;
    setEditing(false);
    router.refresh();
  }, [router, state.success]);

  if (!editing) return <div className="space-y-5">
    {state.success && <p className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} />{t("songEdit.saved")}</p>}
    <div className="metal-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={song.status} />
        <button type="button" className="button-secondary" onClick={() => setEditing(true)}>
          <Pencil size={14} />{t("songEdit.edit")}
        </button>
      </div>
      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {[
          ["BPM", song.bpm],
          [t("song.key"), song.key],
          [t("song.tuning"), song.tuning],
          [t("song.timeSignature"), song.time_signature],
          [t("songEdit.duration"), formatDuration(song.duration)],
          [t("songEdit.arrangementVersion"), song.arrangement_version],
        ].map(([label, value]) => <div key={String(label)}>
          <dt className="text-[9px] uppercase tracking-widest text-zinc-700">{label}</dt>
          <dd className="mt-1 text-sm text-zinc-300">{value ?? "—"}</dd>
        </div>)}
      </dl>
      {song.description && <p className="mt-6 whitespace-pre-wrap border-t border-white/[.06] pt-5 text-sm leading-6 text-zinc-500">{song.description}</p>}
    </div>
  </div>;

  return <form action={action} className="metal-card grid gap-4 p-6 sm:grid-cols-2">
    <input type="hidden" name="locale" value={locale} />
    <label><span className="label">{t("songEdit.title")}</span><input className="field" name="title" required defaultValue={song.title} /></label>
    <label><span className="label">{t("songEdit.subtitle")}</span><input className="field" name="subtitle" defaultValue={song.subtitle ?? ""} /></label>
    <label><span className="label">{t("songEdit.status")}</span>
      <select className="field" name="status" defaultValue={song.status}>
        {songStatuses.map((status) => <option key={status} value={status}>{translateEnum(locale, status)}</option>)}
      </select>
    </label>
    <label><span className="label">BPM</span><input className="field" type="number" min="20" max="400" name="bpm" defaultValue={song.bpm ?? ""} /></label>
    <label><span className="label">{t("song.key")}</span><input className="field" name="key" defaultValue={song.key ?? ""} /></label>
    <label><span className="label">{t("song.tuning")}</span><input className="field" name="tuning" defaultValue={song.tuning ?? ""} /></label>
    <label><span className="label">{t("song.timeSignature")}</span><input className="field" name="time_signature" defaultValue={song.time_signature ?? ""} /></label>
    <div className="grid grid-cols-2 gap-3">
      <label><span className="label">{t("songEdit.minutes")}</span><input className="field" type="number" min="0" name="duration_minutes" defaultValue={Math.floor((song.duration ?? 0) / 60)} /></label>
      <label><span className="label">{t("songEdit.seconds")}</span><input className="field" type="number" min="0" max="59" name="duration_seconds" defaultValue={(song.duration ?? 0) % 60} /></label>
    </div>
    <label className="sm:col-span-2"><span className="label">{t("songEdit.arrangementVersion")}</span><input className="field" name="arrangement_version" defaultValue={song.arrangement_version ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{t("songEdit.description")}</span><textarea className="field min-h-24 py-3" name="description" defaultValue={song.description ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{t("songEdit.lyrics")}</span><textarea className="field min-h-36 py-3" name="lyrics" defaultValue={song.lyrics ?? ""} /></label>
    <label className="sm:col-span-2"><span className="label">{t("songEdit.liveNotes")}</span><textarea className="field min-h-24 py-3" name="live_version_notes" defaultValue={song.live_version_notes ?? ""} /></label>
    <div className="sm:col-span-2"><ResultMessage state={state} /></div>
    <div className="flex justify-end gap-2 sm:col-span-2">
      <button type="button" className="button-secondary" disabled={pending} onClick={() => setEditing(false)}>{t("common.cancel")}</button>
      <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("songEdit.save")}</button>
    </div>
  </form>;
}

export function SongNotesEditor({ song }: { song: Song }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateSong.bind(null, song.id), initialState);
  useEffect(() => {
    if (!state.success) return;
    setEditing(false);
    router.refresh();
  }, [router, state.success]);

  return <div className="metal-card p-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-lg uppercase text-white">{t("song.notes")}</h2>
      {!editing && <button type="button" className="button-secondary" onClick={() => setEditing(true)}><Pencil size={14} />{t("common.edit")}</button>}
    </div>
    {!editing && state.success && <p className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} />{t("songEdit.saved")}</p>}
    {editing ? <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <label><span className="label">{t("songEdit.description")}</span><textarea className="field min-h-28 py-3" name="description" defaultValue={song.description ?? ""} /></label>
      <label><span className="label">{t("songEdit.lyrics")}</span><textarea className="field min-h-56 py-3" name="lyrics" defaultValue={song.lyrics ?? ""} /></label>
      <label><span className="label">{t("songEdit.liveNotes")}</span><textarea className="field min-h-28 py-3" name="live_version_notes" defaultValue={song.live_version_notes ?? ""} /></label>
      <ResultMessage state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" className="button-secondary" onClick={() => setEditing(false)}>{t("common.cancel")}</button>
        <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
      </div>
    </form> : <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div><p className="label">{t("songEdit.description")}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{song.description || t("common.noData")}</p></div>
      <div><p className="label">{t("songEdit.liveNotes")}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{song.live_version_notes || t("common.noData")}</p></div>
      <div className="lg:col-span-2"><p className="label">{t("songEdit.lyrics")}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{song.lyrics || t("common.noData")}</p></div>
    </div>}
  </div>;
}

export function SongLiveEditor({ song }: { song: Song }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateSong.bind(null, song.id), initialState);
  useEffect(() => {
    if (!state.success) return;
    setEditing(false);
    router.refresh();
  }, [router, state.success]);

  return <div className="metal-card p-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-lg uppercase text-white">{t("song.liveVersion")}</h2>
      {!editing && <button type="button" className="button-secondary" onClick={() => setEditing(true)}><Pencil size={14} />{t("common.edit")}</button>}
    </div>
    {!editing && state.success && <p className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} />{t("songEdit.saved")}</p>}
    {editing ? <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <label className="sm:col-span-2"><span className="label">{t("songEdit.liveNotes")}</span><textarea className="field min-h-28 py-3" name="live_version_notes" defaultValue={song.live_version_notes ?? ""} /></label>
      <label className="sm:col-span-2"><span className="label">{t("songEdit.arrangementVersion")}</span><input className="field" name="arrangement_version" defaultValue={song.arrangement_version ?? ""} /></label>
      <label><span className="label">BPM</span><input className="field" type="number" min="20" max="400" name="bpm" defaultValue={song.bpm ?? ""} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="label">{t("songEdit.minutes")}</span><input className="field" type="number" min="0" name="duration_minutes" defaultValue={Math.floor((song.duration ?? 0) / 60)} /></label>
        <label><span className="label">{t("songEdit.seconds")}</span><input className="field" type="number" min="0" max="59" name="duration_seconds" defaultValue={(song.duration ?? 0) % 60} /></label>
      </div>
      <label><span className="label">{t("song.key")}</span><input className="field" name="key" defaultValue={song.key ?? ""} /></label>
      <label><span className="label">{t("song.tuning")}</span><input className="field" name="tuning" defaultValue={song.tuning ?? ""} /></label>
      <label><span className="label">{t("song.timeSignature")}</span><input className="field" name="time_signature" defaultValue={song.time_signature ?? ""} /></label>
      <div className="sm:col-span-2"><ResultMessage state={state} /></div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="button-secondary" onClick={() => setEditing(false)}>{t("common.cancel")}</button>
        <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
      </div>
    </form> : <div className="mt-5">
      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-500">{song.live_version_notes || t("common.noData")}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["BPM", song.bpm], [t("song.key"), song.key], [t("song.tuning"), song.tuning], [t("song.timeSignature"), song.time_signature]].map(([label, value]) => <div key={String(label)}><dt className="label">{label}</dt><dd className="mt-1 text-sm text-zinc-300">{value ?? "—"}</dd></div>)}
      </dl>
    </div>}
  </div>;
}

export function SongMaterialEditor({
  material,
  materialTypes,
}: {
  material: Material;
  materialTypes: string[];
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();
  const [state, action, pending] = useActionState(
    updateSongMaterial.bind(null, material.id, material.song_id),
    initialState,
  );
  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  function remove() {
    if (!window.confirm(t("materialEdit.deleteConfirm"))) return;
    startDeleting(async () => {
      const result = await deleteSongMaterial(material.id, material.song_id, locale);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return <>
    <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-600 hover:bg-white/[.05] hover:text-white" title={t("materialEdit.edit")} aria-label={t("materialEdit.edit")} onClick={() => setOpen(true)}>
      <Pencil size={15} />
    </button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && !deleting && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase text-white">{t("materialEdit.edit")}</h2>
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <label><span className="label">{t("songEdit.title")}</span><input className="field" name="title" required defaultValue={material.title} /></label>
          <label><span className="label">{locale === "en" ? "Type" : "Тип"}</span><select className="field" name="type" defaultValue={material.type}>{materialTypes.map((type) => <option key={type} value={type}>{translateEnum(locale, type)}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="label">URL</span><input className="field" type="url" name="url" required defaultValue={material.url} /></label>
          <label><span className="label">{locale === "en" ? "Version" : "Версия"}</span><input className="field" name="version" defaultValue={material.version ?? ""} /></label>
          <label><span className="label">{t("songEdit.status")}</span><select className="field" name="status" defaultValue={material.status}>{materialStatuses.map((status) => <option key={status} value={status}>{translateEnum(locale, status)}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="label">{t("song.notes")}</span><textarea className="field min-h-24 py-3" name="notes" defaultValue={material.notes ?? ""} /></label>
          {(state.error || deleteError) && <p className="text-xs text-red-300 sm:col-span-2">{state.error || deleteError}</p>}
          {state.success && <p className="flex items-center gap-2 text-xs text-emerald-300 sm:col-span-2"><CheckCircle2 size={14} />{t("materialEdit.saved")}</p>}
          <div className="flex flex-wrap justify-between gap-2 sm:col-span-2">
            <button type="button" className="button-secondary border-red-500/20 text-red-300" disabled={deleting} onClick={remove}><Trash2 size={14} />{t("materialEdit.delete")}</button>
            <div className="flex gap-2">
              <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
              <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("materialEdit.save")}</button>
            </div>
          </div>
        </form>
      </div>
    </div>}
  </>;
}

export function SongCoverEditor({ song }: { song: Song }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(updateSongCover.bind(null, song.id), initialState);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  const statusLabels = {
    draft: t("cover.draft"),
    review: t("cover.review"),
    approved: t("cover.approved"),
    outdated: t("cover.outdated"),
    archived: t("cover.archived"),
  };
  const displayCoverUrl = getSongDisplayCover(song);

  return <div className="grid gap-5 lg:grid-cols-[minmax(280px,.85fr)_1.15fr]">
    <div className="metal-card overflow-hidden border-white/10 bg-black/20">
      {displayCoverUrl
        ? <img src={displayCoverUrl} alt={song.title} className="aspect-square w-full object-cover" />
        : <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-white/10 bg-white/[.02] text-center">
            <div><ImageIcon className="mx-auto text-zinc-700" size={38} /><p className="mt-4 text-sm text-zinc-500">{t("cover.empty")}</p></div>
          </div>}
      <div className="border-t border-white/[.07] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg uppercase text-white">{song.title}</p>
          <span className="inline-flex rounded-full border border-white/15 bg-white/[.04] px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-300">{statusLabels[song.cover_status ?? "draft"]}</span>
        </div>
        {song.cover_notes && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{song.cover_notes}</p>}
      </div>
    </div>
    <form action={action} className="metal-card grid content-start gap-4 p-6">
      <input type="hidden" name="locale" value={locale} />
      <label><span className="label">{song.cover_image_url ? t("cover.replace") : t("cover.upload")}</span><input className="field py-2" type="file" name="cover_file" accept="image/*" /></label>
      <label><span className="label">{locale === "en" ? "Manual cover URL" : "Ссылка на обложку вручную"}</span><input className="field" type="url" name="cover_image_url" defaultValue={song.cover_image_url ?? ""} /></label>
      <label><span className="label">{t("cover.status")}</span><select className="field" name="cover_status" defaultValue={song.cover_status ?? "draft"}>{coverStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
      <label><span className="label">{t("cover.notes")}</span><textarea className="field min-h-28 py-3" name="cover_notes" defaultValue={song.cover_notes ?? ""} /></label>
      <ResultMessage state={state} successText={state.count ? t("cover.uploaded") : t("songEdit.saved")} />
      <div className="flex flex-wrap justify-between gap-2">
        {song.cover_image_url && <button type="submit" name="remove_cover" value="true" className="button-secondary border-red-500/20 text-red-300" disabled={pending}>{t("cover.remove")}</button>}
        <button className="button-primary ml-auto" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}<Upload size={14} />{song.cover_image_url ? t("cover.replace") : t("cover.upload")}</button>
      </div>
    </form>
  </div>;
}

export function SongDangerZone({
  songId,
  setlistUsageCount,
}: {
  songId: string;
  setlistUsageCount: number;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm(t("songEdit.deleteFirst"))) return;
    if (!window.confirm(t("songEdit.deleteSecond"))) return;
    if (setlistUsageCount > 0 && !window.confirm(t("songEdit.setlistWarning"))) return;
    startTransition(async () => {
      const result = await deleteSong(songId, locale);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/songs");
      router.refresh();
    });
  }

  return <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/[.04] p-4">
    <div><p className="font-display text-sm uppercase tracking-wider text-red-300">{t("songEdit.dangerZone")}</p>{error && <p className="mt-2 text-xs text-red-300">{error}</p>}</div>
    <button type="button" className="button-secondary border-red-500/25 text-red-300 hover:bg-red-500/10" disabled={pending} onClick={remove}>
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{t("songEdit.delete")}
    </button>
  </div>;
}
