import { AlbumCard, AlbumCreateDialog } from "@/components/album-components";
import { PageHeader } from "@/components/ui";
import { getAlbumsList, getProfile } from "@/lib/data";
import { translator } from "@/lib/i18n";

export default async function AlbumsPage() {
  const [albums, profile] = await Promise.all([getAlbumsList(), getProfile()]);
  const t = translator(profile.locale);
  return <>
    <PageHeader
      eyebrow={t("albums.release")}
      title={t("albums.title")}
      description={t("albums.description")}
      action={["admin", "member"].includes(profile.role) ? <AlbumCreateDialog /> : undefined}
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
      {!albums.length && <div className="metal-card col-span-full p-14 text-center text-sm text-zinc-600">{t("albums.empty")}</div>}
    </div>
  </>;
}
