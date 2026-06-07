import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TaskCard } from "@/components/cards";
import { PageHeader, PriorityBadge, StatusBadge } from "@/components/ui";
import { projects } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getProfile, getTasks } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project = projects.find((item) => item.id === id) ?? projects[0];
  const [allTasks, profile] = await Promise.all([getTasks(), getProfile()]);
  const t = translator(profile.locale);
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.from("projects").select("*, owner:profiles!owner_id(id,full_name)").eq("id", id).single();
    if (data) project = data;
  }
  return <>
    <Link href="/projects" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white"><ArrowLeft size={14} />{profile.locale === "en" ? "Back to projects" : "К проектам"}</Link>
    <PageHeader eyebrow={translateEnum(profile.locale, project.type)} title={project.title} description={project.description} />
    <div className="grid gap-5 xl:grid-cols-[1fr_2fr]">
      <aside className="metal-card p-6"><div className="flex gap-2"><StatusBadge status={project.status} /><PriorityBadge priority={project.priority} /></div><dl className="mt-7 space-y-5">{[[
        profile.locale === "en" ? "Deadline" : "Дедлайн",
        formatDate(project.deadline, false, profile.locale),
      ], [
        profile.locale === "en" ? "Owner" : "Ответственный",
        project.owner?.full_name ?? (profile.locale === "en" ? "Not assigned" : "Не назначен"),
      ], [
        profile.locale === "en" ? "Progress" : "Прогресс",
        `${project.progress ?? 0}%`,
      ]].map(([key, value]) => <div key={key}><dt className="text-[9px] uppercase tracking-widest text-zinc-700">{key}</dt><dd className="mt-1 text-sm text-zinc-300">{value}</dd></div>)}</dl><div className="mt-7 h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-zinc-300" style={{ width: `${project.progress ?? 0}%` }} /></div></aside>
      <section><h2 className="mb-3 font-display text-lg uppercase text-white">{profile.locale === "en" ? "Project tasks" : "Задачи проекта"}</h2><div className="grid gap-3 md:grid-cols-2">{allTasks.filter((task) => task.project?.id === project.id || task.project_id === project.id).map((task) => <TaskCard key={task.id} task={task} />)}{!allTasks.some((task) => task.project?.id === project.id || task.project_id === project.id) && <p className="metal-card col-span-full p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}</div></section>
    </div>
  </>;
}
