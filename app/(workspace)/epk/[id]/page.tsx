import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { RelatedContentCalendarPanel } from "@/components/content-calendar-components";
import { RelatedCopyPanel } from "@/components/copy-components";
import { EpkMediaManager, EpkProfileEditor, EpkPublicLink } from "@/components/epk-components";
import { RelatedFilesPanel, SharedDocumentsPanel } from "@/components/file-library-components";
import { getAlbumRelationOptions, getContentCalendarItems, getCopyItems, getEpkProfile, getEpkProfiles, getEventRelationOptions, getProfile, getRelatedContentCalendarItems, getRelatedCopyItems, getRelatedFiles, getSharedTechRiderFiles, getSongRelationOptions } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { canDeleteCriticalData, canManageWorkspaceContent } from "@/lib/roles";

export default async function EpkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [epk, profile, relatedCopyItems, relatedFiles, sharedTechRiders, events, albums, songs, epks, copyItems, calendarItems, contentItems] = await Promise.all([
    getEpkProfile(id),
    getProfile(),
    getRelatedCopyItems("epk_id", id),
    getRelatedFiles("epk_id", id),
    getSharedTechRiderFiles(),
    getEventRelationOptions(),
    getAlbumRelationOptions(),
    getSongRelationOptions(),
    getEpkProfiles(),
    getCopyItems("all"),
    getRelatedContentCalendarItems("epk_id", id),
    getContentCalendarItems(),
  ]);
  if (!epk) notFound();
  const t = translator(profile.locale);
  const canEdit = canManageWorkspaceContent(profile.role);
  const canDelete = canDeleteCriticalData(profile.role);

  return <>
    <Link href="/epk" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("page.epk.title")}
    </Link>
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{t("epk.pressKit")}</p>
        <h1 className="font-display text-4xl uppercase leading-none text-white sm:text-6xl">{epk.title}</h1>
        <p className="mt-3 text-xs text-zinc-600">/public/epk/{epk.slug}</p>
      </div>
      <span className={epk.is_public ? "badge border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "badge border-white/10 bg-white/5 text-zinc-400"}>
        {epk.is_public ? t("epk.publicAccessOn") : t("epk.publicAccessOff")}
      </span>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        {canEdit ? <EpkProfileEditor epk={epk} canDelete={canDelete} /> : <div className="metal-card p-6 text-sm text-zinc-500">{t("common.noData")}</div>}
        {canEdit && <EpkMediaManager epkId={epk.id} links={epk.media_links ?? []} />}
      </div>
      <aside className="space-y-5">
        <EpkPublicLink epk={epk} />
        {canEdit && <SharedDocumentsPanel
          techRiders={sharedTechRiders}
          options={{ events, albums, songs, epks, copyItems, contentItems }}
          epkId={epk.id}
          canCreate={canEdit}
        />}
        {canEdit && <RelatedCopyPanel
          title={t("copy.epkCopy")}
          createLabel={t("copy.createEpkCopy")}
          items={relatedCopyItems}
          options={{ events, albums, songs, epks }}
          defaults={{ epk_id: epk.id, category: "epk_bio" }}
        />}
        {canEdit && <RelatedContentCalendarPanel
          title={t("contentCalendar.epkPlan")}
          createLabel={t("contentCalendar.schedulePost")}
          items={calendarItems}
          options={{ copyItems, events, albums, songs, epks }}
          defaults={{ epk_id: epk.id, content_type: "post" }}
        />}
        {canEdit && <RelatedFilesPanel
          title={t("files.epkFiles")}
          items={relatedFiles}
          options={{ events, albums, songs, epks, copyItems, contentItems }}
          defaults={{ epk_id: epk.id, file_type: "press_photo" }}
          allowedTypes={["logo", "press_photo", "document", "image"]}
        />}
      </aside>
    </div>
  </>;
}
