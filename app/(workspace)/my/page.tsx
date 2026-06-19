import Link from "next/link";
import { CalendarDays, DatabaseBackup, MapPin, Music2, UsersRound } from "lucide-react";
import { EventCard, SongCard } from "@/components/cards";
import { RedZone } from "@/components/red-zone";
import { TaskSections } from "@/components/task-sections";
import { EmptyState, PageHeader, SectionHeader, StatusBadge } from "@/components/ui";
import { getMyPageSummary, getProfile } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export default async function MyWorkspacePage() {
  const [workspace, profile] = await Promise.all([
    getMyPageSummary(),
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
          {workspace.loadFailed.tasks && <SectionLoadWarning message={t("my.tasksLoadError")} />}
          <TaskSections tasks={workspace.tasks} activeLimit={6} completedLimit={6} />
        </section>

        <section>
          <SectionHeader title={t("my.songs")} href="/songs" />
          {workspace.loadFailed.songs && <SectionLoadWarning message={t("my.songsLoadError")} />}
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.songs.slice(0, 4).map((song) => <SongCard key={song.id} song={song} />)}
            {!workspace.songs.length && <EmptyState title={t("common.noData")} description={t("my.emptySongs")} />}
          </div>
        </section>

        <section>
          <SectionHeader title={t("my.materials")} />
          {workspace.loadFailed.materials && <SectionLoadWarning message={t("my.materialsLoadError")} />}
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
          {workspace.loadFailed.events && <SectionLoadWarning message={t("my.eventsLoadError")} />}
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.events.slice(0, 4).map((event) => <EventCard key={event.id} event={event} />)}
            {!workspace.events.length && <EmptyState title={t("common.noData")} description={t("my.emptyEvents")} />}
          </div>
        </section>

        <section>
          <SectionHeader title={t("my.rehearsals")} href="/rehearsals" />
          {workspace.loadFailed.rehearsals && <SectionLoadWarning message={t("my.rehearsalsLoadError")} />}
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
        {workspace.loadFailed.redZone && <SectionLoadWarning message={t("my.redZoneLoadError")} />}
        <RedZone issues={workspace.issues} compact />
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

function SectionLoadWarning({ message }: { message: string }) {
  return <p className="mb-3 rounded-lg border border-amber-500/15 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
    {message}
  </p>;
}
