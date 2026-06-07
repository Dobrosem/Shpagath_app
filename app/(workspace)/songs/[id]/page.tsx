import Link from "next/link";
import { ArrowLeft, ExternalLink, FileAudio, FileMusic, FileText, MoreHorizontal } from "lucide-react";
import { notFound } from "next/navigation";
import { TaskCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { MaterialBackupEditor } from "@/components/material-backup-editor";
import { SongDetailTabs } from "@/components/song-detail-tabs";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getProfile, getProfiles } from "@/lib/data";
import { materials, songs, tasks } from "@/lib/demo-data";
import { translateEnum, translator } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { Material, Task } from "@/lib/types";

const materialTypes = [
  "demo", "lyrics", "reaper_project", "logic_project", "sibelius_project",
  "dorico_project", "musescore_project", "guitar_tabs", "bass_tabs",
  "orchestral_score", "orchestral_parts", "vocal_score", "choir_score", "midi",
  "click_track", "backing_track", "stems", "reference_audio", "reference_video",
  "live_version_audio", "live_version_video", "notes_pdf", "tech_notes",
];

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, profiles] = await Promise.all([getProfile(), getProfiles()]);
  const t = translator(profile.locale);
  const supabase = await createClient();
  let song = songs.find((item) => item.id === id) ?? songs[0];
  let songMaterials: Material[] = materials
    .filter((item) => item.song_id === song.id)
    .map((item) => ({ ...item, backup: null }));
  let songTasks: Task[] = tasks.filter((task) => task.song_id === id);

  if (supabase) {
    const [
      { data: realSong, error: songError },
      { data: realMaterials, error: materialsError },
      { data: realTasks, error: tasksError },
    ] = await Promise.all([
      supabase.from("songs").select("*").eq("id", id).single(),
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
    ]);
    if (songError || !realSong) {
      console.error("Supabase read song error:", songError);
      notFound();
    }
    if (materialsError) console.error("Supabase read song materials error:", materialsError);
    if (tasksError) console.error("Supabase read song tasks error:", tasksError);
    song = realSong;
    if (realMaterials) {
      songMaterials = realMaterials.map((material) => ({
        ...material,
        backup: material.material_backups?.[0] ?? null,
      }));
    }
    if (realTasks) songTasks = realTasks;
  }

  const overview = <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
    <div className="metal-card p-6">
      <div className="flex items-center justify-between">
        <StatusBadge status={song.status} />
        <MoreHorizontal className="text-zinc-600" />
      </div>
      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5">
        {[
          ["BPM", song.bpm],
          [t("song.key"), song.key],
          [t("song.tuning"), song.tuning],
          [t("song.timeSignature"), song.time_signature],
          [
            profile.locale === "en" ? "Duration" : "Длительность",
            song.duration
              ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
              : "—",
          ],
          [profile.locale === "en" ? "Version" : "Версия", song.arrangement_version],
        ].map(([label, value]) => <div key={label as string}>
          <dt className="text-[9px] uppercase tracking-widest text-zinc-700">{label}</dt>
          <dd className="mt-1 text-sm text-zinc-300">{value ?? "—"}</dd>
        </div>)}
      </dl>
    </div>
    <div className="metal-card p-6">
      <h2 className="font-display text-lg uppercase text-white">{t("song.liveVersion")}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        {song.live_version_notes || (
          profile.locale === "en"
            ? "No live version notes yet."
            : "Заметок к концертной версии пока нет."
        )}
      </p>
      <div className="mt-5"><StatusBadge status="review" /></div>
    </div>
  </div>;

  const taskContent = <div>
    <h2 className="mb-3 font-display text-lg uppercase text-white">{t("song.tasks")}</h2>
    <div className="grid gap-3 md:grid-cols-2">
      {songTasks.map((task) => <TaskCard key={task.id} task={task} />)}
      {!songTasks.length && <p className="metal-card col-span-full p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
    </div>
  </div>;

  const materialContent = <div>
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg uppercase text-white">{t("song.materials")}</h2>
      <span className="text-xs text-zinc-600">
        {songMaterials.length} {profile.locale === "en" ? "files and links" : "файлов и ссылок"}
      </span>
    </div>
    <div className="table-shell">
      <div className="hidden grid-cols-[1fr_110px_90px_64px] border-b border-white/[.06] px-5 py-3 text-[9px] uppercase tracking-widest text-zinc-700 sm:grid">
        <span>{profile.locale === "en" ? "Material" : "Материал"}</span>
        <span>{profile.locale === "en" ? "Version" : "Версия"}</span>
        <span>{profile.locale === "en" ? "Status" : "Статус"}</span>
        <span />
      </div>
      {songMaterials.map((material) => <div key={material.id} className="grid gap-3 border-b border-white/[.055] px-4 py-4 last:border-0 sm:grid-cols-[1fr_110px_90px_64px] sm:items-center sm:px-5">
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
          <MaterialBackupEditor materialId={material.id} songId={id} backup={material.backup} profiles={profiles} />
          <a href={material.url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-white"><ExternalLink size={15} /></a>
        </div>
      </div>)}
      {!songMaterials.length && <div className="p-12 text-center text-sm text-zinc-600">
        {profile.locale === "en" ? "No materials added yet." : "Материалы ещё не добавлены"}
      </div>}
    </div>
  </div>;

  const notesContent = <div className="grid gap-5 lg:grid-cols-2">
    <div className="metal-card p-6">
      <h2 className="font-display text-lg uppercase text-white">{profile.locale === "en" ? "Description" : "Описание"}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{song.description || t("common.noData")}</p>
    </div>
    <div className="metal-card p-6">
      <h2 className="font-display text-lg uppercase text-white">{profile.locale === "en" ? "Lyrics" : "Текст"}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{song.lyrics || t("common.noData")}</p>
    </div>
  </div>;

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
    />
  </>;
}
