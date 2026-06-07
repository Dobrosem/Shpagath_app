import Link from "next/link";
import { CalendarDays, DatabaseBackup, MapPin, Music2, UsersRound } from "lucide-react";
import { EventCard, SongCard, TaskCard } from "@/components/cards";
import { RedZone } from "@/components/red-zone";
import { EmptyState, PageHeader, SectionHeader, StatusBadge } from "@/components/ui";
import { getMyWorkspace, getProfile, getRedZoneIssues } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export default async function MyWorkspacePage() {
  const [workspace, issues, profile] = await Promise.all([
    getMyWorkspace(),
    getRedZoneIssues(),
    getProfile(),
  ]);
  const t = translator(profile.locale);
  const deadlines = workspace.tasks
    .filter((task) => task.due_date && !["done", "cancelled"].includes(task.status))
    .slice(0, 5);

  return <>
    <PageHeader title={t("page.my.title")} description={t("page.my.description")} />
    <div className="grid gap-7 xl:grid-cols-[1.35fr_.75fr]">
      <div className="space-y-8">
        <section>
          <SectionHeader title={t("my.tasks")} href="/tasks" />
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.tasks.slice(0, 6).map((task) => <TaskCard key={task.id} task={task} />)}
            {!workspace.tasks.length && <EmptyState title={t("common.noData")} description={t("my.emptyTasks")} />}
          </div>
        </section>

        <section>
          <SectionHeader title={t("my.songs")} href="/songs" />
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.songs.slice(0, 4).map((song) => <SongCard key={song.id} song={song} />)}
            {!workspace.songs.length && <EmptyState title={t("common.noData")} description={t("my.emptySongs")} />}
          </div>
        </section>

        <section>
          <SectionHeader title={t("my.materials")} />
          <div className="table-shell divide-y divide-white/[.055]">
            {workspace.materials.slice(0, 8).map((material) => <Link key={material.id} href={`/songs/${material.song_id}`} className="flex items-center gap-3 p-4 hover:bg-white/[.02]">
              <DatabaseBackup size={16} className={material.backup?.status === "ok" ? "text-emerald-400" : "text-amber-400"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-200">{material.title}</p>
                <p className="mt-1 text-[10px] text-zinc-600">{translateEnum(profile.locale, material.type)}</p>
              </div>
              <StatusBadge status={material.backup?.status ?? "missing_backup"} />
            </Link>)}
            {!workspace.materials.length && <p className="p-10 text-center text-sm text-zinc-600">{t("my.emptyMaterials")}</p>}
          </div>
        </section>

        <section>
          <SectionHeader title={t("my.events")} href="/events" />
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.events.slice(0, 4).map((event) => <EventCard key={event.id} event={event} />)}
            {!workspace.events.length && <EmptyState title={t("common.noData")} description={t("my.emptyEvents")} />}
          </div>
        </section>

        <section>
          <SectionHeader title={t("my.rehearsals")} href="/rehearsals" />
          <div className="metal-card divide-y divide-white/[.055]">
            {workspace.rehearsals.slice(0, 5).map((rehearsal) => <div key={rehearsal.id} className="flex items-center gap-3 p-4">
              <UsersRound size={16} className="text-zinc-600" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-200">{rehearsal.title}</p><p className="mt-1 text-[10px] text-zinc-600">{formatDate(rehearsal.starts_at, true, profile.locale)}</p></div>
              {rehearsal.location && <span className="flex items-center gap-1 text-xs text-zinc-600"><MapPin size={12} />{rehearsal.location}</span>}
            </div>)}
            {!workspace.rehearsals.length && <p className="p-10 text-center text-sm text-zinc-600">{t("my.emptyRehearsals")}</p>}
          </div>
        </section>
      </div>

      <aside className="space-y-7">
        <RedZone issues={issues} compact />
        <section>
          <SectionHeader title={t("my.deadlines")} />
          <div className="metal-card divide-y divide-white/[.055]">
            {deadlines.map((task) => <Link href="/tasks" key={task.id} className="flex items-center gap-3 p-4 hover:bg-white/[.02]">
              <CalendarDays size={15} className="text-zinc-600" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-300">{task.title}</p><p className="mt-1 text-[10px] text-zinc-600">{formatDate(task.due_date, false, profile.locale)}</p></div>
            </Link>)}
            {!deadlines.length && <p className="p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
          </div>
        </section>
      </aside>
    </div>
  </>;
}

