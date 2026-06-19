"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Disc3, LayoutGrid, List, Rows3 } from "lucide-react";
import type { Album, Song } from "@/lib/types";
import { cn, formatDate, formatDuration, getAlbumCoverUrl, getSongResolvedCover } from "@/lib/utils";
import { translateEnum } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { SongCard } from "./cards";
import { StatusBadge } from "./ui";

type SongSort = "title-asc" | "title-desc" | "newest" | "oldest" | "status" | "album" | "track" | "duration";
type SongView = "cards" | "compact" | "table";

const sortValues: SongSort[] = ["title-asc", "title-desc", "newest", "oldest", "status", "album", "track", "duration"];
const viewValues: SongView[] = ["cards", "compact", "table"];

function songTimestamp(song: Song, field: "created_at" | "updated_at") {
  const value = song[field];
  return value ? new Date(value).getTime() || 0 : 0;
}

function songAlbumTitle(song: Song) {
  return song.album?.title ?? "";
}

function sortSongs(songs: Song[], sort: SongSort, locale: string) {
  return [...songs].sort((left, right) => {
    switch (sort) {
      case "title-desc":
        return right.title.localeCompare(left.title, locale);
      case "newest":
        return songTimestamp(right, "created_at") - songTimestamp(left, "created_at");
      case "oldest":
        return songTimestamp(left, "created_at") - songTimestamp(right, "created_at");
      case "status":
        return left.status.localeCompare(right.status, locale) || left.title.localeCompare(right.title, locale);
      case "album":
        return songAlbumTitle(left).localeCompare(songAlbumTitle(right), locale) || left.title.localeCompare(right.title, locale);
      case "track":
        return songAlbumTitle(left).localeCompare(songAlbumTitle(right), locale)
          || (left.track_number ?? Number.MAX_SAFE_INTEGER) - (right.track_number ?? Number.MAX_SAFE_INTEGER)
          || left.title.localeCompare(right.title, locale);
      case "duration":
        return (left.duration ?? Number.MAX_SAFE_INTEGER) - (right.duration ?? Number.MAX_SAFE_INTEGER)
          || left.title.localeCompare(right.title, locale);
      case "title-asc":
      default:
        return left.title.localeCompare(right.title, locale);
    }
  });
}

function SongCompactCard({ song }: { song: Song }) {
  const { locale, t } = useI18n();
  const coverUrl = getSongResolvedCover(song);
  return <Link href={`/songs/${song.id}`} className="metal-card flex items-center gap-3 p-3 transition hover:border-white/15">
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
      {coverUrl ? <img src={coverUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Disc3 size={17} className="text-zinc-700" /></div>}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-zinc-100">{song.title}</p>
      <p className="mt-1 truncate text-[10px] uppercase tracking-[.12em] text-zinc-600">
        {[song.album?.title, song.track_number ? `#${song.track_number}` : null, formatDuration(song.duration), song.key].filter(Boolean).join(" · ") || t("common.noData")}
      </p>
    </div>
    <StatusBadge status={song.status} />
    <span className="hidden text-xs text-zinc-600 sm:block">{translateEnum(locale, song.album?.type ?? "")}</span>
  </Link>;
}

function SongTable({ songs }: { songs: Song[] }) {
  const { locale, t } = useI18n();
  return <div className="table-shell overflow-x-auto">
    <div className="min-w-[780px]">
      <div className="grid grid-cols-[minmax(220px,1.5fr)_110px_minmax(180px,1fr)_80px_90px_120px] border-b border-white/[.06] px-5 py-3 text-[9px] uppercase tracking-widest text-zinc-700">
        <span>{t("songEdit.title")}</span>
        <span>{t("songEdit.status")}</span>
        <span>{t("albums.current")}</span>
        <span>{t("albums.trackNumber")}</span>
        <span>{t("songEdit.duration")}</span>
        <span>{locale === "en" ? "Updated" : "Обновлено"}</span>
      </div>
      {songs.map((song) => <Link key={song.id} href={`/songs/${song.id}`} className="grid grid-cols-[minmax(220px,1.5fr)_110px_minmax(180px,1fr)_80px_90px_120px] items-center gap-3 border-b border-white/[.055] px-5 py-3 text-sm transition last:border-0 hover:bg-white/[.025]">
        <span className="min-w-0">
          <span className="block truncate text-zinc-200">{song.title}</span>
          {song.subtitle && <span className="mt-1 block truncate text-[10px] text-zinc-600">{song.subtitle}</span>}
        </span>
        <StatusBadge status={song.status} />
        <span className="truncate text-zinc-500">{song.album?.title ?? "—"}</span>
        <span className="text-zinc-500">{song.track_number ?? "—"}</span>
        <span className="text-zinc-500">{formatDuration(song.duration)}</span>
        <span className="text-xs text-zinc-600">{song.updated_at ? formatDate(song.updated_at, false, locale) : "—"}</span>
      </Link>)}
    </div>
  </div>;
}

export function SongsCatalog({ songs, albums }: { songs: Song[]; albums: Album[] }) {
  const [mode, setMode] = useState<"all" | "albums">("all");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const sort = sortValues.includes(searchParams.get("sort") as SongSort) ? searchParams.get("sort") as SongSort : "newest";
  const view = viewValues.includes(searchParams.get("view") as SongView) ? searchParams.get("view") as SongView : "cards";
  const sortedSongs = useMemo(() => sortSongs(songs, sort, locale), [locale, songs, sort]);
  const albumSongs = (albumId: string) => sortedSongs
    .filter((song) => song.album_id === albumId)
    .sort((left, right) => (left.track_number ?? Number.MAX_SAFE_INTEGER) - (right.track_number ?? Number.MAX_SAFE_INTEGER) || left.title.localeCompare(right.title, locale));
  const releaseAlbums = albums.filter((album) => album.type !== "single");
  const singleAlbums = albums.filter((album) => album.type === "single");
  const singles = singleAlbums.flatMap((album) => albumSongs(album.id));
  const withoutAlbum = sortedSongs.filter((song) => !song.album_id);

  function updateParam(key: "sort" | "view", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function renderSongs(items: Song[]) {
    if (view === "table") return <SongTable songs={items} />;
    if (view === "compact") return <div className="grid gap-2 xl:grid-cols-2">{items.map((song) => <SongCompactCard key={song.id} song={song} />)}</div>;
    return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{items.map((song) => <SongCard key={song.id} song={song} />)}</div>;
  }

  return <>
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-white/[.06] bg-white/[.018] p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={mode === "all" ? "button-primary" : "button-secondary"} onClick={() => setMode("all")}>{t("albums.allSongs")}</button>
        <button type="button" className={mode === "albums" ? "button-primary" : "button-secondary"} onClick={() => setMode("albums")}>{t("albums.byAlbums")}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          {t("songs.sort")}
          <select className="field h-10 w-48" value={sort} onChange={(event) => updateParam("sort", event.target.value)}>
            <option value="title-asc">{t("songs.sortTitleAsc")}</option>
            <option value="title-desc">{t("songs.sortTitleDesc")}</option>
            <option value="newest">{t("songs.sortNewest")}</option>
            <option value="oldest">{t("songs.sortOldest")}</option>
            <option value="status">{t("songs.sortStatus")}</option>
            <option value="album">{t("songs.sortAlbum")}</option>
            <option value="track">{t("songs.sortTrack")}</option>
            <option value="duration">{t("songs.sortDuration")}</option>
          </select>
        </label>
        <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
          {[
            ["cards", t("songs.viewCards"), LayoutGrid],
            ["compact", t("songs.viewCompact"), Rows3],
            ["table", t("songs.viewTable"), List],
          ].map(([value, label, Icon]) => <button
            key={String(value)}
            type="button"
            className={cn("grid h-9 w-9 place-items-center rounded-md text-zinc-600 transition hover:text-white", view === value && "bg-white/[.08] text-white")}
            title={String(label)}
            aria-label={String(label)}
            onClick={() => updateParam("view", String(value))}
          >
            <Icon size={15} />
          </button>)}
        </div>
      </div>
    </div>
    {mode === "all"
      ? <>
          {renderSongs(sortedSongs)}
          {!songs.length && <div className="metal-card col-span-full p-12 text-center text-sm text-zinc-600">{locale === "en" ? "No songs yet. Create the first song." : "Песен пока нет. Создайте первую песню."}</div>}
        </>
      : <div className="space-y-8">
          {releaseAlbums.map((album) => {
            const groupedSongs = albumSongs(album.id);
            const coverUrl = getAlbumCoverUrl(album);
            return <section key={album.id}>
              <div className="mb-4 flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                  {coverUrl ? <img src={coverUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Disc3 size={22} className="text-zinc-700" /></div>}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl uppercase text-white">{album.title}</h2>
                  <div className="mt-2 flex items-center gap-2"><span className="text-xs text-zinc-600">{translateEnum(locale, album.type)}</span><StatusBadge status={album.status} context="album" /></div>
                </div>
              </div>
              {groupedSongs.length ? renderSongs(groupedSongs) : <p className="metal-card p-8 text-center text-sm text-zinc-600">{t("albums.noSongsAvailable")}</p>}
            </section>;
          })}
          <section>
            <h2 className="mb-4 font-display text-xl uppercase text-white">{t("albums.singles")}</h2>
            {singles.length ? renderSongs(singles) : <p className="metal-card p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
          </section>
          <section>
            <h2 className="mb-4 font-display text-xl uppercase text-white">{t("albums.withoutAlbum")}</h2>
            {withoutAlbum.length ? renderSongs(withoutAlbum) : <p className="metal-card p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
          </section>
        </div>}
  </>;
}
