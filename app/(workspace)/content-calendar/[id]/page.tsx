import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ContentCalendarEditor } from "@/components/content-calendar-components";
import { getAlbumRelationOptions, getContentCalendarItem, getCopyItems, getEpkProfiles, getEventRelationOptions, getProfile, getSongRelationOptions } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { canDeleteCriticalData, canManageWorkspaceContent } from "@/lib/roles";

export default async function ContentCalendarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, profile, copyItems, events, albums, songs, epks] = await Promise.all([
    getContentCalendarItem(id),
    getProfile(),
    getCopyItems("all"),
    getEventRelationOptions(),
    getAlbumRelationOptions(),
    getSongRelationOptions(),
    getEpkProfiles(),
  ]);
  if (!item) notFound();
  const t = translator(profile.locale);
  const options = { copyItems, events, albums, songs, epks };
  const canEdit = canManageWorkspaceContent(profile.role);
  const canDelete = canDeleteCriticalData(profile.role);

  return <>
    <Link href="/content-calendar" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("contentCalendar.titlePage")}
    </Link>
    <header className="mb-7">
      <p className="eyebrow">{translateEnum(profile.locale, item.channel)} · {translateEnum(profile.locale, item.content_type)}</p>
      <h1 className="font-display text-4xl uppercase leading-none text-white sm:text-6xl">{item.title}</h1>
      <p className="mt-3 text-xs uppercase tracking-[.14em] text-zinc-600">{translateEnum(profile.locale, item.status)}</p>
    </header>
    {canEdit ? <ContentCalendarEditor item={item} options={options} canDelete={canDelete} /> : <div className="metal-card p-6 text-sm text-zinc-500">{t("common.noData")}</div>}
  </>;
}
