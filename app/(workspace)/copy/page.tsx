import Link from "next/link";
import { CopyCreateButton, CopyItemCard } from "@/components/copy-components";
import { PageHeader } from "@/components/ui";
import { getAlbums, getCopyItems, getEpkProfiles, getEvents, getProfile, getSongs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import type { CopyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const tabs: { key: "all" | CopyStatus; label: "copy.all" | "copy.drafts" | "copy.approved" }[] = [
  { key: "all", label: "copy.all" },
  { key: "draft", label: "copy.drafts" },
  { key: "approved", label: "copy.approved" },
];

export default async function CopyPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const active = status === "draft" || status === "approved" ? status : "all";
  const [items, profile, events, albums, songs, epks] = await Promise.all([
    getCopyItems(active),
    getProfile(),
    getEvents(),
    getAlbums(),
    getSongs(),
    getEpkProfiles(),
  ]);
  const t = translator(profile.locale);
  const options = { events, albums, songs, epks };

  return <>
    <PageHeader
      eyebrow={t("copy.copy")}
      title={t("copy.library")}
      description={t("copy.description")}
      action={["admin", "manager", "member"].includes(profile.role) ? <CopyCreateButton options={options} /> : undefined}
    />
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => <Link
        key={tab.key}
        href={tab.key === "all" ? "/copy" : `/copy?status=${tab.key}`}
        className={cn("rounded-lg border px-3 py-2 text-xs uppercase tracking-[.12em] transition", active === tab.key ? "border-white/20 bg-white/[.06] text-white" : "border-white/[.08] text-zinc-600 hover:text-zinc-200")}
      >
        {t(tab.label)}
      </Link>)}
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <CopyItemCard key={item.id} item={item} />)}
      {!items.length && <div className="metal-card col-span-full p-14 text-center text-sm text-zinc-600">{t("copy.noItems")}</div>}
    </div>
  </>;
}
