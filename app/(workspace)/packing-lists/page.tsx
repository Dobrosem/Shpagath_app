import Link from "next/link";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { EntityDialog } from "@/components/entity-dialog";
import { EmptyState, PageHeader } from "@/components/ui";
import { getEventRelationOptions, getPackingLists, getProfile, getProjects } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";

export default async function PackingListsPage() {
  const [lists, events, projects, profile] = await Promise.all([
    getPackingLists(),
    getEventRelationOptions(),
    getProjects(),
    getProfile(),
  ]);
  const t = translator(profile.locale);

  return <>
    <PageHeader
      title={t("page.packingLists.title")}
      description={t("page.packingLists.description")}
      action={<EntityDialog
        title={t("packing.new")}
        table="packing_lists"
        path="/packing-lists"
        detailPath="/packing-lists"
        fields={[
          { name: "title", label: t("packing.title"), required: true },
          { name: "type", label: t("packing.type"), type: "select", required: true, defaultValue: "local_concert", options: ["local_concert", "tour", "festival", "rehearsal", "recording"].map((value) => ({ value, label: value })) },
          { name: "event_id", label: t("packing.event"), type: "select", options: events.map((event) => ({ value: event.id, label: event.title })) },
          { name: "project_id", label: t("packing.project"), type: "select", options: projects.map((project) => ({ value: project.id, label: project.title })) },
        ]}
      />}
    />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {lists.map((list) => {
        const packed = list.items?.filter((item) => item.packed).length ?? 0;
        const total = list.items?.length ?? 0;
        const progress = total ? Math.round((packed / total) * 100) : 0;
        return <Link key={list.id} href={`/packing-lists/${list.id}`} className="metal-card p-5 transition hover:border-white/15">
          <div className="flex items-start justify-between">
            <PackageCheck size={19} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">{progress}%</span>
          </div>
          <p className="mt-5 text-[10px] uppercase tracking-wider text-zinc-600">{translateEnum(profile.locale, list.type)}</p>
          <h2 className="mt-1 text-lg text-zinc-100">{list.title}</h2>
          <p className="mt-2 truncate text-xs text-zinc-600">{list.event?.title ?? list.project?.title ?? "—"}</p>
          <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-emerald-400" style={{ width: `${progress}%` }} /></div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-600"><CheckCircle2 size={13} />{packed}/{total} {t("common.items")}</p>
        </Link>;
      })}
      {!lists.length && <EmptyState title={t("common.noData")} description={t("packing.empty")} />}
    </div>
  </>;
}
