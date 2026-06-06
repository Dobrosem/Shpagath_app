import Link from "next/link";
import { ArrowLeft, ExternalLink, FileAudio, FileMusic, FileText, Link2, MoreHorizontal } from "lucide-react";
import { EntityDialog } from "@/components/entity-dialog";
import { TaskCard } from "@/components/cards";
import { PageHeader, StatusBadge } from "@/components/ui";
import { materials, songs, tasks } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

const materialTypes = ["demo", "lyrics", "reaper_project", "logic_project", "guitar_tabs", "bass_tabs", "orchestral_score", "orchestral_parts", "vocal_score", "choir_score", "midi", "click_track", "backing_track", "stems", "reference_audio", "reference_video", "notes_pdf"];
export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  let song = songs.find((item) => item.id === id) ?? songs[0];
  let songMaterials = materials.filter((item) => item.song_id === song.id);
  if (supabase) {
    const [{ data: realSong }, { data: realMaterials }] = await Promise.all([
      supabase.from("songs").select("*").eq("id", id).single(),
      supabase.from("song_materials").select("*").eq("song_id", id).order("created_at", { ascending: false }),
    ]);
    if (realSong) song = realSong;
    if (realMaterials) songMaterials = realMaterials;
  }
  return <>
    <Link href="/songs" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white"><ArrowLeft size={14} />К песням</Link>
    <PageHeader eyebrow={song.subtitle ?? "Песня"} title={song.title}
      action={<EntityDialog title="Материал песни" table="song_materials" path={`/songs/${id}`} fields={[
        { name: "song_id", label: "ID песни", required: true, placeholder: id }, { name: "title", label: "Название", required: true },
        { name: "type", label: "Тип", type: "select", required: true, options: materialTypes.map((value) => ({ value, label: value.replaceAll("_", " ") })) },
        { name: "url", label: "Ссылка", type: "url", required: true }, { name: "version", label: "Версия" },
        { name: "status", label: "Статус", type: "select", required: true, options: ["draft", "active", "approved", "outdated"].map((value) => ({ value, label: value })) },
        { name: "notes", label: "Заметки", type: "textarea" },
      ]} />} />
    <div className="mb-7 flex flex-wrap gap-2">{["Overview", "Tasks", "Materials", "Notes", "Live Version", "Versions", "Rehearsal Notes"].map((tab, index) => <button key={tab} className={index === 0 ? "button-primary" : "button-secondary"}>{tab}</button>)}</div>
    <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <div className="space-y-5">
        <div className="metal-card p-6">
          <div className="flex items-center justify-between"><StatusBadge status={song.status} /><button><MoreHorizontal className="text-zinc-600" /></button></div>
          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5">
            {[["BPM", song.bpm], ["Тональность", song.key], ["Строй", song.tuning], ["Размер", song.time_signature], ["Длительность", song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}` : "—"], ["Версия", song.arrangement_version]].map(([label, value]) => <div key={label as string}><dt className="text-[9px] uppercase tracking-widest text-zinc-700">{label}</dt><dd className="mt-1 text-sm text-zinc-300">{value ?? "—"}</dd></div>)}
          </dl>
        </div>
        <div className="metal-card p-6"><h2 className="font-display text-lg uppercase text-white">Live version</h2><p className="mt-3 text-sm leading-6 text-zinc-600">В бридже оставить 4 такта для взаимодействия с залом. Финальный удар строго по голосовой команде.</p><div className="mt-5"><StatusBadge status="review" /></div></div>
        <div><h2 className="mb-3 font-display text-lg uppercase text-white">Задачи</h2><div className="space-y-2">{tasks.slice(0, 2).map((task) => <TaskCard key={task.id} task={task} compact />)}</div></div>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg uppercase text-white">Материалы</h2><span className="text-xs text-zinc-600">{songMaterials.length} файлов и ссылок</span></div>
        <div className="table-shell">
          <div className="hidden grid-cols-[1fr_130px_90px_40px] border-b border-white/[.06] px-5 py-3 text-[9px] uppercase tracking-widest text-zinc-700 sm:grid"><span>Материал</span><span>Версия</span><span>Статус</span><span /></div>
          {songMaterials.map((material) => <div key={material.id} className="grid gap-3 border-b border-white/[.055] px-4 py-4 last:border-0 sm:grid-cols-[1fr_130px_90px_40px] sm:items-center sm:px-5">
            <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[.035] text-zinc-500">{material.type.includes("audio") || material.type.includes("track") ? <FileAudio size={16} /> : material.type.includes("score") || material.type.includes("tabs") ? <FileMusic size={16} /> : <FileText size={16} />}</div><div className="min-w-0"><p className="truncate text-sm text-zinc-200">{material.title}</p><p className="mt-1 text-[10px] text-zinc-700">{material.type.replaceAll("_", " ")}</p></div></div>
            <span className="text-xs text-zinc-500">{material.version ?? "—"}</span><StatusBadge status={material.status} /><a href={material.url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-white"><ExternalLink size={15} /></a>
          </div>)}
          {!songMaterials.length && <div className="p-12 text-center text-sm text-zinc-600">Материалы ещё не добавлены</div>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Табулатуры", "guitar + bass", FileMusic], ["Нотные материалы", "score + parts", FileText], ["Концертный пакет", "click + backing", Link2]].map(([title, subtitle, Icon]) => <div key={title as string} className="metal-card p-5"><Icon className="text-zinc-600" size={19} /><p className="mt-5 text-sm text-zinc-300">{title as string}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-700">{subtitle as string}</p></div>)}</div>
      </div>
    </section>
  </>;
}
