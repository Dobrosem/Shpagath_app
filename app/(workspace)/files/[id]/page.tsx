import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { FileEditor } from "@/components/file-library-components";
import { getAlbums, getContentCalendarItems, getCopyItems, getEpkProfiles, getEvents, getFileRecord, getProfile, getSongs } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";

export default async function FileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [file, profile, events, albums, songs, epks, copyItems, contentItems] = await Promise.all([
    getFileRecord(id),
    getProfile(),
    getEvents(),
    getAlbums(),
    getSongs(),
    getEpkProfiles(),
    getCopyItems("all"),
    getContentCalendarItems(),
  ]);
  if (!file) notFound();
  const t = translator(profile.locale);
  const canEdit = ["admin", "manager", "member"].includes(profile.role);
  const options = { events, albums, songs, epks, copyItems, contentItems };

  return <>
    <Link href="/files" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("files.library")}
    </Link>
    <header className="mb-7">
      <p className="eyebrow">{translateEnum(profile.locale, file.file_type)}</p>
      <h1 className="font-display text-4xl uppercase leading-none text-white sm:text-6xl">{file.title}</h1>
      <p className="mt-3 text-xs uppercase tracking-[.14em] text-zinc-600">{translateEnum(profile.locale, file.status)}</p>
    </header>
    {canEdit
      ? <FileEditor file={file} options={options} canDelete={canEdit} />
      : <div className="metal-card p-6 text-sm text-zinc-500">{t("common.noData")}</div>}
  </>;
}
