import Link from "next/link";
import { Crosshair, DatabaseBackup, FolderKanban } from "lucide-react";
import { EventCard } from "@/components/cards";
import { RedZone } from "@/components/red-zone";
import { TaskSections } from "@/components/task-sections";
import { Metric, PageHeader, SectionHeader } from "@/components/ui";
import {
  getEvents,
  getMyWorkspace,
  getProfile,
  getProjects,
  getRedZoneIssues,
  getSongs,
  getTasks,
} from "@/lib/data";
import { translator } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const [allProjects, allTasks, allEvents, allSongs, myWorkspace, issues, profile] = await Promise.all([
    getProjects(),
    getTasks(),
    getEvents(),
    getSongs(),
    getMyWorkspace(),
    getRedZoneIssues(),
    getProfile(),
  ]);
  const t = translator(profile.locale);
  const now = new Date();
  const overdue = allTasks.filter(
    (task) => task.due_date && new Date(task.due_date) < now && !["done", "cancelled"].includes(task.status),
  );
  const upcomingEvents = allEvents.filter((event) => new Date(event.starts_at) >= now).slice(0, 2);
  const nearestEvent = upcomingEvents[0];
  const activeWorkspaceTasks = myWorkspace.tasks
    .filter((task) => !["done", "cancelled"].includes(task.status))
    .slice(0, 5);
  const missingBackups = allSongs.reduce((sum, song) => sum + (song.missing_backups_count ?? 0), 0);
  const deadlines = [
    ...allProjects.filter((project) => project.deadline).map((project) => ({
      id: `project-${project.id}`,
      title: project.title,
      date: project.deadline!,
      href: `/projects/${project.id}`,
    })),
    ...allTasks.filter((task) => task.due_date && !["done", "cancelled"].includes(task.status)).map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      date: task.due_date!,
      href: "/tasks",
    })),
  ].sort((left, right) => left.date.localeCompare(right.date)).slice(0, 6);

  return <>
    <PageHeader
      eyebrow={t("page.dashboard.eyebrow")}
      title={t("page.dashboard.title")}
      description={t("page.dashboard.description")}
      action={<div className="flex gap-2">
        <Link href="/my" className="button-secondary"><Crosshair size={15} />{t("nav.my")}</Link>
        <Link href="/projects" className="button-primary"><FolderKanban size={15} />{t("nav.projects")}</Link>
      </div>}
    />

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label={t("dashboard.activeProjects")} value={allProjects.filter((project) => project.status === "in_progress").length} />
      <Metric label={t("dashboard.myTasks")} value={activeWorkspaceTasks.length} />
      <Metric label={t("dashboard.overdue")} value={overdue.length} accent />
      <Metric label={t("dashboard.nextEvent")} value={nearestEvent ? formatDate(nearestEvent.starts_at, false, profile.locale) : "—"} detail={nearestEvent?.city} />
    </section>

    <section className="mt-8 grid gap-7 xl:grid-cols-[1.25fr_.85fr]">
      <div>
        <SectionHeader title={t("dashboard.nearestTasks")} href="/my" />
        <TaskSections tasks={myWorkspace.tasks} compact activeLimit={5} completedLimit={5} />
      </div>
      <RedZone issues={issues} compact />
    </section>

    <section className="mt-8 grid gap-7 xl:grid-cols-[1.25fr_.85fr]">
      <div>
        <SectionHeader title={t("dashboard.events")} href="/events" />
        <div className="grid gap-3 md:grid-cols-2">
          {upcomingEvents.map((event) => <EventCard key={event.id} event={event} />)}
          {!upcomingEvents.length && <p className="metal-card col-span-full p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
        </div>
      </div>
      <div>
        <SectionHeader title={t("dashboard.deadlines")} />
        <div className="metal-card divide-y divide-white/[.055]">
          {deadlines.map((item) => <Link key={item.id} href={item.href} className="flex items-center justify-between gap-4 p-4 hover:bg-white/[.02]">
            <span className="truncate text-sm text-zinc-300">{item.title}</span>
            <span className="shrink-0 text-xs text-zinc-600">{formatDate(item.date, false, profile.locale)}</span>
          </Link>)}
          {!deadlines.length && <p className="p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
        </div>
      </div>
    </section>

    <section className="mt-8">
      <SectionHeader title={t("backup.missingCount")} href="/songs" />
      <div className="metal-card flex items-center gap-4 p-6">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-500/10 text-amber-300"><DatabaseBackup size={20} /></div>
        <p className="font-display text-3xl text-zinc-100">{missingBackups}</p>
        <p className="text-sm text-zinc-600">{t("backup.missingCount")}</p>
      </div>
    </section>
  </>;
}
