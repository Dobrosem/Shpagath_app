import Link from "next/link";
import { ArrowLeft, ExternalLink, FileAudio, FileMusic, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { TaskCard } from "@/components/cards";
import { SongAlbumEditor } from "@/components/album-components";
import { EntityDialog } from "@/components/entity-dialog";
import { RelatedFilesPanel } from "@/components/file-library-components";
import { MaterialBackupEditor } from "@/components/material-backup-editor";
import { SongDetailTabs } from "@/components/song-detail-tabs";
import {
  SongCoverEditor,
  SongDangerZone,
  SongLiveEditor,
  SongMaterialEditor,
  SongNotesEditor,
  SongOverviewEditor,
} from "@/components/song-editors";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getAlbumRelationOptions, getContentCalendarItems, getCopyItems, getEpkProfiles, getEventRelationOptions, getProfile, getProfiles, getRelatedFiles, getSongRelationOptions } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getStorageDisplayUrl } from "@/lib/storage";
import type { Material, Song, Task } from "@/lib/types";

const materialTypes = [
  "demo", "lyrics", "reaper_project", "logic_project", "sibelius_project",
  "dorico_project", "musescore_project", "guitar_tabs", "bass_tabs",
  "orchestral_score", "orchestral_parts", "vocal_score", "choir_score", "midi",
  "click_track", "backing_track", "stems", "reference_audio", "reference_video",
  "live_version_audio", "live_version_video", "notes_pdf", "tech_notes",
];

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, profiles, albums, events, allSongs, epks, copyItems, contentItems, relatedFiles] = await Promise.all([
    getProfile(),
    getProfiles(),
    getAlbumRelationOptions(),
    getEventRelationOptions(),
    getSongRelationOptions(),
    getEpkProfiles(),
    getCopyItems("all"),
    getContentCalendarItems(),
    getRelatedFiles("song_id", id),
  ]);
  const t = translator(profile.locale);
  const supabase = await createClient();
  if (!supabase) notFound();
  const [
    { data: realSong, error: songError },
    { data: realMaterials, error: materialsError },
    { data: realTasks, error: tasksError },
    { count: setlistUsageCount, error: setlistUsageError },
  ] = await Promise.all([
    supabase.from("songs").select("*, album:albums(id,title,type,status,cover_image_url)").eq("id", id).single(),
    supabase
      .from("song_materials")
      .select("*, material_backups(*)")
      .eq("song_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)")
      .eq("song_id", id)
      .order("due_date"),
    supabase
      .from("setlist_items")
      .select("id", { count: "exact", head: true })
      .eq("song_id", id),
  ]);
  if (songError || !realSong) {
    console.error("Supabase read song error:", songError);
    notFound();
  }
  if (materialsError) console.error("Supabase read song materials error:", materialsError);
  if (tasksError) console.error("Supabase read song tasks error:", tasksError);
  if (setlistUsageError) console.error("Supabase read song setlist usage error:", setlistUsageError);
  const rawAlbum = Array.isArray(realSong.album) ? realSong.album[0] : realSong.album;
  const song = {
    ...(realSong as Song),
    cover_display_url: await getStorageDisplayUrl(supabase, "song-covers", realSong.cover_image_url),
    album: rawAlbum ? {
      ...rawAlbum,
      cover_display_url: await getStorageDisplayUrl(supabase, "album-covers", rawAlbum.cover_image_url),
    } : null,
  };
  const songMaterials = (realMaterials ?? []).map((material) => ({
    ...material,
    backup: material.material_backups?.[0] ?? null,
  })) as Material[];
  const songTasks = (realTasks as Task[]) ?? [];
  const canEdit = ["admin", "member", "manager"].includes(profile.role);

  const overview = <div>
    <SongOverviewEditor song={song} />
    {canEdit && <SongAlbumEditor song={song} albums={albums} />}
    <SongDangerZone songId={id} setlistUsageCount={setlistUsageCount ?? 0} />
  </div>;

  const taskContent = <div>
    <h2 className="mb-3 font-display text-lg uppercase text-white">{t("song.tasks")}</h2>
    <div className="grid gap-3 md:grid-cols-2">
      {songTasks.map((task) => <TaskCard key={task.id} task={task} />)}
      {!songTasks.length && <p className="metal-card col-span-full p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
    </div>
  </div>;

  const materialContent = <div>
    <div className="mb-5">
      <RelatedFilesPanel
        title={t("files.songFiles")}
        items={relatedFiles}
        options={{ events, albums, songs: allSongs, epks, copyItems, contentItems }}
        defaults={{ song_id: id, file_type: "lyrics" }}
        canCreate={canEdit}
        allowedTypes={["lyrics", "guitar_tab", "bass_tab", "orchestral_score", "orchestral_parts", "document", "image", "artwork"]}
      />
    </div>
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg uppercase text-white">{t("song.materials")}</h2>
      <span className="text-xs text-zinc-600">
        {songMaterials.length} {profile.locale === "en" ? "files and links" : "файлов и ссылок"}
      </span>
    </div>
    <div className="table-shell">
      <div className="hidden grid-cols-[1fr_110px_100px_132px] border-b border-white/[.06] px-5 py-3 text-[9px] uppercase tracking-widest text-zinc-700 sm:grid">
        <span>{profile.locale === "en" ? "Material" : "Материал"}</span>
        <span>{profile.locale === "en" ? "Version" : "Версия"}</span>
        <span>{profile.locale === "en" ? "Status" : "Статус"}</span>
        <span />
      </div>
      {songMaterials.map((material) => <div key={material.id} className="grid gap-3 border-b border-white/[.055] px-4 py-4 last:border-0 sm:grid-cols-[1fr_110px_100px_132px] sm:items-center sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[.035] text-zinc-500">
            {material.type.includes("audio") || material.type.includes("track")
              ? <FileAudio size={16} />
              : material.type.includes("score") || material.type.includes("tabs")
                ? <FileMusic size={16} />
                : <FileText size={16} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-zinc-200">{material.title}</p>
            <p className="mt-1 text-[10px] text-zinc-700">{translateEnum(profile.locale, material.type)}</p>
          </div>
        </div>
        <span className="text-xs text-zinc-500">{material.version ?? "—"}</span>
        <div className="space-y-1">
          <StatusBadge status={material.status} />
          <StatusBadge status={material.backup?.status ?? "missing_backup"} />
        </div>
        <div className="flex items-center gap-3">
          <SongMaterialEditor material={material} materialTypes={materialTypes} />
          <MaterialBackupEditor materialId={material.id} songId={id} backup={material.backup} profiles={profiles} />
          {material.url && <a href={material.url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-white"><ExternalLink size={15} /></a>}
        </div>
      </div>)}
      {!songMaterials.length && <div className="p-12 text-center text-sm text-zinc-600">
        {profile.locale === "en" ? "No materials added yet." : "Материалы ещё не добавлены"}
      </div>}
    </div>
  </div>;

  const notesContent = <SongNotesEditor song={song} />;
  const liveContent = <SongLiveEditor song={song} />;
  const backupContent = <div className="grid gap-3">
    {songMaterials.map((material) => <div key={material.id} className="metal-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-200">{material.title}</p>
        <p className="mt-1 text-[10px] text-zinc-600">{translateEnum(profile.locale, material.type)}</p>
      </div>
      <StatusBadge status={material.backup?.status ?? "missing_backup"} />
      <MaterialBackupEditor materialId={material.id} songId={id} backup={material.backup} profiles={profiles} mode="button" />
    </div>)}
    {!songMaterials.length && <p className="metal-card p-10 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
  </div>;
  const coverContent = <SongCoverEditor song={song} />;

  return <>
    <Link href="/songs" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{profile.locale === "en" ? "Back to songs" : "К песням"}
    </Link>
    <PageHeader
      eyebrow={song.subtitle ?? (profile.locale === "en" ? "Song" : "Песня")}
      title={song.title}
      action={<EntityDialog
        title={profile.locale === "en" ? "Song material" : "Материал песни"}
        table="song_materials"
        path={`/songs/${id}`}
        hiddenValues={{ song_id: id }}
        fields={[
          { name: "title", label: profile.locale === "en" ? "Title" : "Название", required: true },
          { name: "type", label: profile.locale === "en" ? "Type" : "Тип", type: "select", required: true, options: materialTypes.map((value) => ({ value, label: value })) },
          { name: "url", label: profile.locale === "en" ? "URL" : "Ссылка", type: "url", required: true },
          { name: "version", label: profile.locale === "en" ? "Version" : "Версия" },
          { name: "status", label: profile.locale === "en" ? "Status" : "Статус", type: "select", defaultValue: "draft", options: ["draft", "active", "approved", "outdated", "archived"].map((value) => ({ value, label: value })) },
          { name: "notes", label: profile.locale === "en" ? "Notes" : "Заметки", type: "textarea" },
        ]}
      />}
    />
    <SongDetailTabs
      overview={overview}
      materials={materialContent}
      tasks={taskContent}
      notes={notesContent}
      live={liveContent}
      backups={backupContent}
      cover={coverContent}
    />
  </>;
}
