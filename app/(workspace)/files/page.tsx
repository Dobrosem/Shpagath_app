import Link from "next/link";
import { FileCard, FileCreateButton } from "@/components/file-library-components";
import { PageHeader } from "@/components/ui";
import { getAlbums, getContentCalendarItems, getCopyItems, getEpkProfiles, getEvents, getFileRecords, getProfile, getSongs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const filters = ["all", "documents", "images", "audio", "archived"] as const;
type FileFilter = (typeof filters)[number];

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const params = await searchParams;
  const filter = filters.includes(params.filter as FileFilter) ? params.filter as FileFilter : "all";
  const [files, profile, events, albums, songs, epks, copyItems, contentItems] = await Promise.all([
    getFileRecords(filter),
    getProfile(),
    getEvents(),
    getAlbums(),
    getSongs(),
    getEpkProfiles(),
    getCopyItems("all"),
    getContentCalendarItems(),
  ]);
  const t = translator(profile.locale);
  const canEdit = ["admin", "manager", "member"].includes(profile.role);
  const options = { events, albums, songs, epks, copyItems, contentItems };
  const tabs: { value: FileFilter; label: string }[] = [
    { value: "all", label: t("files.all") },
    { value: "documents", label: t("files.documents") },
    { value: "images", label: t("files.images") },
    { value: "audio", label: t("files.audio") },
    { value: "archived", label: t("files.archive") },
  ];

  return <>
    <PageHeader
      eyebrow={t("nav.group.administration")}
      title={t("files.systemLibrary")}
      description={t("files.systemDescription")}
      action={canEdit ? <FileCreateButton options={options} /> : undefined}
    />
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => <Link
        key={tab.value}
        href={tab.value === "all" ? "/files" : `/files?filter=${tab.value}`}
        className={cn("rounded-full border px-3 py-1.5 text-xs transition", filter === tab.value ? "border-ember/50 bg-ember/10 text-ember" : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-white")}
      >
        {tab.label}
      </Link>)}
    </div>
    {files.length
      ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{files.map((file) => <FileCard key={file.id} file={file} />)}</div>
      : <div className="metal-card p-14 text-center text-sm text-zinc-600">{t("files.empty")}</div>}
  </>;
}
