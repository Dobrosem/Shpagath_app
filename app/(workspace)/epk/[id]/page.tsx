import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { EpkMediaManager, EpkProfileEditor, EpkPublicLink } from "@/components/epk-components";
import { getEpkProfile, getProfile } from "@/lib/data";
import { translator } from "@/lib/i18n";

export default async function EpkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [epk, profile] = await Promise.all([getEpkProfile(id), getProfile()]);
  if (!epk) notFound();
  const t = translator(profile.locale);
  const canEdit = ["admin", "manager", "member"].includes(profile.role);

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
        {canEdit ? <EpkProfileEditor epk={epk} canDelete={["admin", "manager"].includes(profile.role)} /> : <div className="metal-card p-6 text-sm text-zinc-500">{t("common.noData")}</div>}
        {canEdit && <EpkMediaManager epkId={epk.id} links={epk.media_links ?? []} />}
      </div>
      <aside className="space-y-5">
        <EpkPublicLink epk={epk} />
      </aside>
    </div>
  </>;
}
