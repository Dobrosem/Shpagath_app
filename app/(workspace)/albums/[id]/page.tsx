import Link from "next/link";
import { ArrowLeft, Disc3 } from "lucide-react";
import { notFound } from "next/navigation";
import {
  AlbumEditDialog,
  AlbumSongsManager,
} from "@/components/album-components";
import { RelatedContentCalendarPanel } from "@/components/content-calendar-components";
import { RelatedCopyPanel } from "@/components/copy-components";
import { StatusBadge } from "@/components/ui";
import { getAlbum, getAlbums, getCopyItems, getEpkProfiles, getEvents, getProfile, getRelatedContentCalendarItems, getRelatedCopyItems, getSongs } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { formatDate, getAlbumCoverUrl } from "@/lib/utils";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [album, songs, profile, relatedCopyItems, events, albums, epks, copyItems, calendarItems] = await Promise.all([
    getAlbum(id),
    getSongs(),
    getProfile(),
    getRelatedCopyItems("album_id", id),
    getEvents(),
    getAlbums(),
    getEpkProfiles(),
    getCopyItems("all"),
    getRelatedContentCalendarItems("album_id", id),
  ]);
  if (!album) notFound();
  const t = translator(profile.locale);
  const availableSongs = songs.filter((song) => !song.album_id);
  const canEdit = ["admin", "member", "manager"].includes(profile.role);
  const coverUrl = getAlbumCoverUrl(album);

  return <>
    <Link href="/albums" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("albums.title")}
    </Link>

    <section className="mb-6 grid gap-5 lg:grid-cols-[minmax(280px,420px)_1fr] lg:items-stretch">
      <div className="metal-card group relative aspect-square overflow-hidden">
        {coverUrl
          ? <img src={coverUrl} alt={album.title} className="h-full w-full object-cover" />
          : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,.08),transparent_68%)]"><Disc3 size={56} className="text-zinc-800" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        {canEdit && <div className="absolute right-3 top-3">
          <AlbumEditDialog
            album={album}
            canDelete={profile.role === "admin"}
            triggerClassName="button-secondary min-h-10 border-white/15 bg-black/50 px-3 text-white backdrop-blur-md hover:bg-black/70"
          />
        </div>}
        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={album.cover_status} />
          {album.cover_notes && <span className="line-clamp-1 text-xs text-zinc-300">{album.cover_notes}</span>}
        </div>
      </div>

      <div className="metal-card flex min-h-full flex-col justify-between p-5 sm:p-7">
        <div>
          <p className="eyebrow">{translateEnum(profile.locale, album.type)}</p>
          <h1 className="mt-2 font-display text-4xl uppercase leading-none text-white sm:text-6xl">{album.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatusBadge status={album.status} context="album" />
            <span className="text-xs text-zinc-500">
              {t("albums.releaseDate")}: {album.release_date ? formatDate(album.release_date, false, profile.locale) : "—"}
            </span>
            <span className="text-xs text-zinc-500">{t("albums.songs")}: {album.songs_count ?? 0}</span>
          </div>
          {album.description
            ? <p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-zinc-400">{album.description}</p>
            : <p className="mt-6 text-sm text-zinc-700">{t("common.noData")}</p>}
        </div>
      </div>
    </section>

    <AlbumSongsManager album={album} availableSongs={availableSongs} readOnly={!canEdit} />
    {canEdit && <div className="mt-5">
      <RelatedCopyPanel
        title={t("copy.releaseCopy")}
        createLabel={t("copy.createReleaseCopy")}
        items={relatedCopyItems}
        options={{ events, albums, songs, epks }}
        defaults={{ album_id: album.id, category: "release_announcement" }}
      />
      <div className="mt-5">
        <RelatedContentCalendarPanel
          title={t("contentCalendar.releasePlan")}
          createLabel={t("contentCalendar.schedulePost")}
          items={calendarItems}
          options={{ copyItems, events, albums, songs, epks }}
          defaults={{ album_id: album.id, content_type: "announcement" }}
        />
      </div>
    </div>}
  </>;
}
