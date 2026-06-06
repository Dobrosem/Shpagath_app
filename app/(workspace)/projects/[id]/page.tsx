import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TaskCard } from "@/components/cards";
import { PageHeader, PriorityBadge, StatusBadge } from "@/components/ui";
import { projects } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getTasks } from "@/lib/data";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project = projects.find((item) => item.id === id) ?? projects[0];
  const allTasks = await getTasks();
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.from("projects").select("*, owner:profiles!owner_id(id,full_name)").eq("id", id).single();
    if (data) project = data;
  }
  return <>
    <Link href="/projects" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white"><ArrowLeft size={14} />К проектам</Link>
    <PageHeader eyebrow={project.type} title={project.title} description={project.description} action={<button className="button-secondary">Редактировать</button>} />
    <div className="grid gap-5 xl:grid-cols-[1fr_2fr]">
      <aside className="metal-card p-6"><div className="flex gap-2"><StatusBadge status={project.status} /><PriorityBadge priority={project.priority} /></div><dl className="mt-7 space-y-5">{[["Дедлайн", formatDate(project.deadline)], ["Ответственный", project.owner?.full_name ?? "Не назначен"], ["Прогресс", `${project.progress ?? 0}%`]].map(([key, value]) => <div key={key}><dt className="text-[9px] uppercase tracking-widest text-zinc-700">{key}</dt><dd className="mt-1 text-sm text-zinc-300">{value}</dd></div>)}</dl><div className="mt-7 h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-zinc-300" style={{ width: `${project.progress ?? 0}%` }} /></div></aside>
      <section><h2 className="mb-3 font-display text-lg uppercase text-white">Задачи проекта</h2><div className="grid gap-3 md:grid-cols-2">{allTasks.filter((task) => task.project?.id === project.id || task.project_id === project.id).map((task) => <TaskCard key={task.id} task={task} />)}</div></section>
    </div>
  </>;
}
