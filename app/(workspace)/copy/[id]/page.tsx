import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { RelatedContentCalendarPanel } from "@/components/content-calendar-components";
import { CopyItemEditor } from "@/components/copy-components";
import { getAlbumRelationOptions, getCopyItem, getCopyItems, getEpkProfiles, getEventRelationOptions, getProfile, getRelatedContentCalendarItems, getSongRelationOptions } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { canDeleteCriticalData, canManageWorkspaceContent } from "@/lib/roles";

export default async function CopyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, profile, events, albums, songs, epks, copyItems, calendarItems] = await Promise.all([
    getCopyItem(id),
    getProfile(),
    getEventRelationOptions(),
    getAlbumRelationOptions(),
    getSongRelationOptions(),
    getEpkProfiles(),
    getCopyItems("all"),
    getRelatedContentCalendarItems("copy_item_id", id),
  ]);
  if (!item) notFound();
  const t = translator(profile.locale);
  const options = { events, albums, songs, epks };
  const calendarOptions = { copyItems, events, albums, songs, epks };
  const canEdit = canManageWorkspaceContent(profile.role);
  const canDelete = canDeleteCriticalData(profile.role);

  return <>
    <Link href="/copy" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("copy.library")}
    </Link>
    <header className="mb-7">
      <p className="eyebrow">{translateEnum(profile.locale, item.category)}</p>
      <h1 className="font-display text-4xl uppercase leading-none text-white sm:text-6xl">{item.title}</h1>
      <p className="mt-3 text-xs uppercase tracking-[.14em] text-zinc-600">
        {[item.channel ? translateEnum(profile.locale, item.channel) : null, item.language.toUpperCase(), translateEnum(profile.locale, item.status)].filter(Boolean).join(" · ")}
      </p>
    </header>
    {canEdit ? <CopyItemEditor item={item} options={options} canDelete={canDelete} /> : <div className="metal-card p-6 text-sm text-zinc-500">{t("common.noData")}</div>}
    <div className="mt-5">
      <RelatedContentCalendarPanel
        title={t("contentCalendar.scheduledPosts")}
        createLabel={t("contentCalendar.schedulePost")}
        items={calendarItems}
        options={calendarOptions}
        defaults={{ copy_item_id: item.id, channel: item.channel ?? "vk", content_type: "post" }}
      />
    </div>
  </>;
}
