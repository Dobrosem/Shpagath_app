import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { PackingListItems } from "@/components/packing-list-items";
import { PageHeader } from "@/components/ui";
import { getPackingList, getProfile, getProfiles } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { canDeleteOperationalData } from "@/lib/roles";

export default async function PackingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [list, profiles, profile] = await Promise.all([
    getPackingList(id),
    getProfiles(),
    getProfile(),
  ]);
  if (!list) notFound();
  const t = translator(profile.locale);
  const canEdit = canDeleteOperationalData(profile.role);
  const items = list.items ?? [];
  const packed = items.filter((item) => item.packed).length;
  const progress = items.length ? Math.round((packed / items.length) * 100) : 0;

  return <>
    <Link href="/packing-lists" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("packing.back")}
    </Link>
    <PageHeader
      eyebrow={translateEnum(profile.locale, list.type)}
      title={list.title}
      description={list.event?.title ?? list.project?.title ?? undefined}
      action={<div className="metal-card min-w-44 p-4">
        <p className="text-[9px] uppercase tracking-wider text-zinc-600">{t("packing.progress")}</p>
        <p className="mt-1 flex items-center gap-2 text-xl text-zinc-100"><CheckCircle2 size={18} className="text-emerald-400" />{progress}%</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-emerald-400" style={{ width: `${progress}%` }} /></div>
      </div>}
    />
    <PackingListItems listId={id} items={items} profiles={profiles} canEdit={canEdit} />
  </>;
}
