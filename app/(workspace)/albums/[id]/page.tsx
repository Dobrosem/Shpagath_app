import Link from "next/link";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { notFound } from "next/navigation";
import {
  AlbumCoverEditor,
  AlbumDeleteButton,
  AlbumEditDialog,
  AlbumSongsManager,
} from "@/components/album-components";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getAlbum, getProfile, getSongs } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { formatDate, getAlbumCoverUrl } from "@/lib/utils";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [album, songs, profile] = await Promise.all([getAlbum(id), getSongs(), getProfile()]);
  if (!album) notFound();
  const t = translator(profile.locale);
  const availableSongs = songs.filter((song) => !song.album_id);
  const canEdit = ["admin", "member", "manager"].includes(profile.role);
  const coverUrl = getAlbumCoverUrl(album);

  return <>
    <Link href="/albums" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("albums.title")}
    </Link>
    <PageHeader
      eyebrow={translateEnum(profile.locale, album.type)}
      title={album.title}
      description={album.description ?? undefined}
      action={canEdit || profile.role === "admin"
        ? <div className="flex flex-wrap gap-2">{canEdit && <AlbumEditDialog album={album} />}{profile.role === "admin" && <AlbumDeleteButton album={album} />}</div>
        : undefined}
    />
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <StatusBadge status={album.status} context="album" />
      <span className="text-xs text-zinc-600">{t("albums.releaseDate")}: {album.release_date ? formatDate(album.release_date, false, profile.locale) : "—"}</span>
      <span className="text-xs text-zinc-600">{t("albums.songs")}: {album.songs_count ?? 0}</span>
    </div>
    <div className="space-y-6">
      {canEdit
        ? <AlbumCoverEditor album={album} />
        : <div className="metal-card max-w-xl overflow-hidden">
            {coverUrl
              ? <img src={coverUrl} alt={album.title} className="aspect-square w-full object-cover" />
              : <div className="grid aspect-square place-items-center"><ImageIcon size={42} className="text-zinc-700" /></div>}
            <div className="border-t border-white/[.06] p-5"><StatusBadge status={album.cover_status} />{album.cover_notes && <p className="mt-4 text-sm text-zinc-500">{album.cover_notes}</p>}</div>
          </div>}
      <AlbumSongsManager album={album} availableSongs={availableSongs} readOnly={!canEdit} />
    </div>
  </>;
}
