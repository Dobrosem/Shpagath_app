"use client";

import { useState } from "react";
import { Disc3 } from "lucide-react";
import type { Album, Song } from "@/lib/types";
import { getAlbumCoverUrl } from "@/lib/utils";
import { translateEnum } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { SongCard } from "./cards";
import { StatusBadge } from "./ui";

export function SongsCatalog({ songs, albums }: { songs: Song[]; albums: Album[] }) {
  const [mode, setMode] = useState<"all" | "albums">("all");
  const { locale, t } = useI18n();
  const albumSongs = (albumId: string) => songs
    .filter((song) => song.album_id === albumId)
    .sort((left, right) => (left.track_number ?? Number.MAX_SAFE_INTEGER) - (right.track_number ?? Number.MAX_SAFE_INTEGER) || left.title.localeCompare(right.title, locale));
  const releaseAlbums = albums.filter((album) => album.type !== "single");
  const singleAlbums = albums.filter((album) => album.type === "single");
  const singles = singleAlbums.flatMap((album) => albumSongs(album.id));
  const withoutAlbum = songs.filter((song) => !song.album_id);

  return <>
    <div className="mb-5 flex gap-2">
      <button type="button" className={mode === "all" ? "button-primary" : "button-secondary"} onClick={() => setMode("all")}>{t("albums.allSongs")}</button>
      <button type="button" className={mode === "albums" ? "button-primary" : "button-secondary"} onClick={() => setMode("albums")}>{t("albums.byAlbums")}</button>
    </div>
    {mode === "all"
      ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {songs.map((song) => <SongCard key={song.id} song={song} />)}
          {!songs.length && <div className="metal-card col-span-full p-12 text-center text-sm text-zinc-600">{locale === "en" ? "No songs yet. Create the first song." : "Песен пока нет. Создайте первую песню."}</div>}
        </div>
      : <div className="space-y-8">
          {releaseAlbums.map((album) => {
            const groupedSongs = albumSongs(album.id);
            const coverUrl = getAlbumCoverUrl(album);
            return <section key={album.id}>
              <div className="mb-4 flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                  {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Disc3 size={22} className="text-zinc-700" /></div>}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl uppercase text-white">{album.title}</h2>
                  <div className="mt-2 flex items-center gap-2"><span className="text-xs text-zinc-600">{translateEnum(locale, album.type)}</span><StatusBadge status={album.status} context="album" /></div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {groupedSongs.map((song) => <SongCard key={song.id} song={song} />)}
                {!groupedSongs.length && <p className="metal-card p-8 text-center text-sm text-zinc-600">{t("albums.noSongsAvailable")}</p>}
              </div>
            </section>;
          })}
          <section>
            <h2 className="mb-4 font-display text-xl uppercase text-white">{t("albums.singles")}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {singles.map((song) => <SongCard key={song.id} song={song} />)}
              {!singles.length && <p className="metal-card p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-display text-xl uppercase text-white">{t("albums.withoutAlbum")}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {withoutAlbum.map((song) => <SongCard key={song.id} song={song} />)}
              {!withoutAlbum.length && <p className="metal-card p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
            </div>
          </section>
        </div>}
  </>;
}
