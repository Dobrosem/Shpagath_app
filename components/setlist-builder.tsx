"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Disc3, Loader2, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { saveEventSetlist } from "@/app/actions";
import type { ActionState, EventSetlistItem, Song } from "@/lib/types";
import { getSongResolvedCover } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

const initialState: ActionState = { success: false, error: null };

type SelectedSong = Pick<Song, "id" | "title" | "bpm" | "key" | "tuning" | "cover_image_url" | "cover_display_url" | "album"> & {
  live_version: string;
  notes: string;
};

export function SetlistBuilder({
  eventId,
  songs,
  initialItems,
}: {
  eventId: string;
  songs: Song[];
  initialItems: EventSetlistItem[];
}) {
  const { locale, t } = useI18n();
  const songsById = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);
  const [selected, setSelected] = useState<SelectedSong[]>(() =>
    [...initialItems]
      .sort((a, b) => a.order_index - b.order_index)
      .flatMap((item) => {
        const catalogSong = songsById.get(item.song_id);
        const song = catalogSong ? { ...catalogSong, ...item.song } : item.song;
        if (!song) return [];
        return [{
          id: song.id,
          title: song.title,
          bpm: song.bpm,
          key: song.key,
          tuning: song.tuning,
          cover_image_url: catalogSong?.cover_image_url,
          cover_display_url: catalogSong?.cover_display_url,
          album: catalogSong?.album,
          live_version: item.live_version ?? "",
          notes: item.notes ?? "",
        }];
      }),
  );
  const [state, action, pending] = useActionState(
    saveEventSetlist.bind(null, eventId),
    initialState,
  );
  const selectedIds = new Set(selected.map((song) => song.id));

  function toggleSong(song: Song, checked: boolean) {
    if (checked) {
      setSelected((current) => current.some((item) => item.id === song.id)
        ? current
        : [...current, {
            id: song.id,
            title: song.title,
            bpm: song.bpm,
            key: song.key,
            tuning: song.tuning,
            cover_image_url: song.cover_image_url,
            cover_display_url: song.cover_display_url,
            album: song.album,
            live_version: song.arrangement_version ?? "",
            notes: song.live_version_notes ?? "",
          }]);
      return;
    }
    setSelected((current) => current.filter((item) => item.id !== song.id));
  }

  function removeSong(songId: string) {
    setSelected((current) => current.filter((item) => item.id !== songId));
  }

  function moveSong(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.length) return;
    setSelected((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function updateSong(index: number, field: "live_version" | "notes", value: string) {
    setSelected((current) => current.map((song, songIndex) =>
      songIndex === index ? { ...song, [field]: value } : song,
    ));
  }

  return <form action={action}>
    <input type="hidden" name="locale" value={locale} />
    <input
      type="hidden"
      name="items"
      value={JSON.stringify(selected.map((song) => ({
        song_id: song.id,
        live_version: song.live_version,
        notes: song.notes,
      })))}
    />

    <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <section className="metal-card self-start p-5 xl:sticky xl:top-6">
        <p className="eyebrow">{t("setlistBuilder.selectSongs")}</p>
        <h2 className="font-display text-xl uppercase text-white">{t("setlistBuilder.allSongs")}</h2>
        {songs.length ? <div className="mt-4 max-h-[62vh] space-y-1 overflow-y-auto pr-1">
          {songs.map((song) => {
            const checked = selectedIds.has(song.id);
            const coverUrl = getSongResolvedCover(song);
            return <label
              key={song.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition hover:border-white/[.08] hover:bg-white/[.025]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-orange-500"
                checked={checked}
                onChange={(event) => toggleSong(song, event.target.checked)}
              />
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-white/[.08] bg-zinc-950">
                {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : <Disc3 size={16} className="text-zinc-700" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-zinc-200">{song.title}</span>
                <span className="block text-[10px] uppercase tracking-wide text-zinc-600">
                  {[song.album?.title, song.bpm && `${song.bpm} BPM`, song.key, song.tuning].filter(Boolean).join(" · ") || "—"}
                </span>
              </span>
              {checked && <CheckCircle2 size={14} className="text-emerald-400" />}
            </label>;
          })}
        </div> : <div className="py-10 text-center">
          <p className="text-sm text-zinc-500">{t("setlistBuilder.noSongs")}</p>
          <p className="mt-2 text-xs text-zinc-700">{t("setlistBuilder.addSongsHint")}</p>
          <Link href="/songs" className="button-secondary mt-5">{t("nav.songs")}</Link>
        </div>}
      </section>

      <section className="metal-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{t("setlistBuilder.selectedSongs")}</p>
            <h2 className="font-display text-xl uppercase text-white">
              {t("setlistBuilder.title")} · {selected.length}
            </h2>
          </div>
        </div>

        {selected.length ? <ol className="mt-5 space-y-3">
          {selected.map((song, index) => (
            <li key={song.id} className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 w-7 shrink-0 font-display text-lg text-zinc-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-white/[.08] bg-zinc-950">
                  {getSongResolvedCover(song) ? <img src={getSongResolvedCover(song)!} alt="" className="h-full w-full object-cover" /> : <Disc3 size={16} className="text-zinc-700" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-zinc-100">{song.title}</h3>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
                    {[song.album?.title, song.bpm && `${song.bpm} BPM`, song.key, song.tuning].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-white/[.08] text-zinc-500 transition hover:text-white disabled:opacity-25"
                    aria-label={t("setlistBuilder.moveUp")}
                    title={t("setlistBuilder.moveUp")}
                    disabled={index === 0}
                    onClick={() => moveSong(index, -1)}
                  ><ChevronUp size={16} /></button>
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-white/[.08] text-zinc-500 transition hover:text-white disabled:opacity-25"
                    aria-label={t("setlistBuilder.moveDown")}
                    title={t("setlistBuilder.moveDown")}
                    disabled={index === selected.length - 1}
                    onClick={() => moveSong(index, 1)}
                  ><ChevronDown size={16} /></button>
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-red-500/10 text-zinc-600 transition hover:border-red-500/25 hover:text-red-300"
                    aria-label={t("setlistBuilder.remove")}
                    title={t("setlistBuilder.remove")}
                    onClick={() => removeSong(song.id)}
                  ><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">{t("setlistBuilder.liveVersion")}</span>
                  <input
                    className="field"
                    value={song.live_version}
                    onChange={(event) => updateSong(index, "live_version", event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">{t("setlistBuilder.performanceNotes")}</span>
                  <input
                    className="field"
                    value={song.notes}
                    onChange={(event) => updateSong(index, "notes", event.target.value)}
                  />
                </label>
              </div>
            </li>
          ))}
        </ol> : <div className="mt-5 rounded-xl border border-dashed border-white/[.08] px-6 py-14 text-center text-sm text-zinc-600">
          {t("setlistBuilder.empty")}
        </div>}

        {state.error && <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertCircle size={15} className="shrink-0" />{state.error}
        </div>}
        {state.success && <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 size={15} />{t("setlistBuilder.saved")}
        </div>}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/[.06] pt-5">
          <Link href={`/events/${eventId}`} className="button-secondary">
            {t("battleSheet.backToEvent")}
          </Link>
          <button type="submit" className="button-primary" disabled={pending}>
            {pending && <Loader2 size={14} className="animate-spin" />}
            {pending ? t("common.saving") : t("setlistBuilder.save")}
          </button>
        </div>
      </section>
    </div>
  </form>;
}
