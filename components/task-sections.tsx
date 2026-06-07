"use client";

import { ChevronDown } from "lucide-react";
import type { Task } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { TaskCard } from "./cards";

export function TaskSections({
  tasks,
  compact = false,
  activeLimit,
  completedLimit,
}: {
  tasks: Task[];
  compact?: boolean;
  activeLimit?: number;
  completedLimit?: number;
}) {
  const { t } = useI18n();
  const allActiveTasks = tasks.filter((task) => task.status !== "done");
  const allCompletedTasks = tasks.filter((task) => task.status === "done");
  const activeTasks = activeLimit == null ? allActiveTasks : allActiveTasks.slice(0, activeLimit);
  const completedTasks = completedLimit == null
    ? allCompletedTasks
    : allCompletedTasks.slice(0, completedLimit);
  const gridClass = compact ? "space-y-2" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3";

  return <div className="space-y-5">
    <section>
      <h3 className="mb-3 text-[10px] uppercase tracking-[.16em] text-zinc-600">{t("tasks.active")}</h3>
      <div className={gridClass}>
        {activeTasks.map((task) => <TaskCard key={task.id} task={task} compact={compact} />)}
        {!activeTasks.length && <p className="metal-card p-7 text-center text-sm text-zinc-600">{t("tasks.noActive")}</p>}
      </div>
    </section>
    <details className="group/completed">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-white/[.06] bg-white/[.015] px-4 py-3 text-xs text-zinc-500 transition hover:border-white/10 hover:text-zinc-300">
        <span>{t("tasks.completed")} · {allCompletedTasks.length}</span>
        <ChevronDown size={15} className="transition group-open/completed:rotate-180" />
      </summary>
      <div className={`${gridClass} mt-3`}>
        {completedTasks.map((task) => <TaskCard key={task.id} task={task} compact={compact} />)}
        {!completedTasks.length && <p className="metal-card p-7 text-center text-sm text-zinc-600">{t("tasks.noCompleted")}</p>}
      </div>
    </details>
  </div>;
}
