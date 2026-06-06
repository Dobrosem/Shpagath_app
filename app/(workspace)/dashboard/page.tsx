import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, Crosshair, Plus } from "lucide-react";
import { EventCard, ProjectCard, TaskCard } from "@/components/cards";
import { Metric, PageHeader, SectionHeader } from "@/components/ui";
import { activity } from "@/lib/demo-data";
import { getEvents, getProjects, getTasks } from "@/lib/data";

export default async function DashboardPage() {
  const [allProjects, allTasks, allEvents] = await Promise.all([getProjects(), getTasks(), getEvents()]);
  const overdue = allTasks.filter((task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== "done");
  return <>
    <PageHeader eyebrow="Командный центр" title="Состояние системы" description="Концерты, релизы и задачи Saphath в одном рабочем контуре."
      action={<div className="flex gap-2"><Link href="/tasks" className="button-secondary"><Crosshair size={15} />Мои задачи</Link><Link href="/projects" className="button-primary"><Plus size={15} />Новый проект</Link></div>} />

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Активные проекты" value={allProjects.filter((p) => p.status === "in_progress").length} detail="в текущем цикле" />
      <Metric label="Задачи на мне" value={allTasks.length} detail="4 требуют внимания" />
      <Metric label="Просрочено" value={overdue.length || 1} accent detail="нужна реакция" />
      <Metric label="Ближайший концерт" value={allEvents.length ? "47 дн." : "—"} detail={allEvents[0]?.city ?? "не назначен"} />
    </section>

    <section className="mt-8 grid gap-7 xl:grid-cols-[1.45fr_.75fr]">
      <div>
        <SectionHeader title="Ближайшие задачи" href="/tasks" />
        <div className="metal-card space-y-2 p-3">{allTasks.slice(0, 5).map((task) => <TaskCard key={task.id} task={task} compact />)}</div>
      </div>
      <div>
        <SectionHeader title="Требует решения" />
        <div className="metal-card p-5">
          <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ember/10 text-ember"><AlertTriangle size={17} /></div><div><p className="text-sm text-zinc-200">Утвердить мастер</p><p className="mt-1 text-xs leading-5 text-zinc-600">The Last Light · версия v7.2 ожидает финального решения.</p></div></div>
          <Link href="/songs/s1" className="mt-5 flex items-center justify-between border-t border-white/[.06] pt-4 text-xs text-zinc-500 hover:text-white">Открыть материал <ArrowRight size={14} /></Link>
        </div>
        <div className="mt-3 metal-card p-5">
          <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400"><CalendarClock size={17} /></div><div><p className="text-sm text-zinc-200">Смета съёмки</p><p className="mt-1 text-xs leading-5 text-zinc-600">Согласование просрочено на 2 дня.</p></div></div>
        </div>
      </div>
    </section>

    <section className="mt-8"><SectionHeader title="Проекты в работе" href="/projects" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{allProjects.slice(0, 4).map((project) => <ProjectCard key={project.id} project={project} />)}</div></section>
    <section className="mt-8 grid gap-7 xl:grid-cols-[1.4fr_.8fr]">
      <div><SectionHeader title="Ближайшие концерты" href="/events" /><div className="grid gap-3 md:grid-cols-2">{allEvents.slice(0, 2).map((event) => <EventCard key={event.id} event={event} />)}</div></div>
      <div><SectionHeader title="Последние изменения" /><div className="metal-card divide-y divide-white/[.055] px-5">{activity.map((item) => <div key={item.id} className="py-4"><p className="text-xs text-zinc-300"><span className="font-medium text-zinc-100">{item.user}</span> {item.action}</p><p className="mt-1 text-[11px] text-zinc-600">{item.target} · {item.at}</p></div>)}</div></div>
    </section>
  </>;
}
