import type {
  Event,
  Material,
  MaterialBackup,
  PromoMaterial,
  RedZoneIssue,
  Task,
} from "./types";

export const criticalMaterialTypes = new Set([
  "reaper_project",
  "logic_project",
  "sibelius_project",
  "dorico_project",
  "musescore_project",
  "orchestral_score",
  "orchestral_parts",
  "click_track",
  "backing_track",
  "stems",
]);

interface RedZoneInput {
  tasks: Task[];
  events: Event[];
  promo: PromoMaterial[];
  materials: (Material & { song?: { title: string } | null })[];
  backups: MaterialBackup[];
  setlistEventIds: Set<string>;
  riderFileEventIds?: Set<string>;
}

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function daysUntil(value: string, now: Date) {
  return Math.ceil((dayStart(new Date(value)) - dayStart(now)) / 86_400_000);
}

export function buildRedZoneIssues(
  { tasks, events, promo, materials, backups, setlistEventIds, riderFileEventIds = new Set() }: RedZoneInput,
  now = new Date(),
): RedZoneIssue[] {
  const today = dayStart(now);
  const backupByMaterial = new Map(backups.map((backup) => [backup.material_id, backup]));
  const issues: RedZoneIssue[] = [];

  for (const task of tasks) {
    if (["done", "cancelled"].includes(task.status)) continue;
    if (task.due_date && dayStart(new Date(task.due_date)) < today) {
      issues.push({
        id: `overdue-task-${task.id}`,
        kind: "overdue_task",
        severity: task.priority === "critical" ? "critical" : "warning",
        title: task.title,
        href: "/tasks",
        date: task.due_date,
      });
    } else if (task.priority === "critical") {
      issues.push({
        id: `critical-task-${task.id}`,
        kind: "critical_task",
        severity: "critical",
        title: task.title,
        href: "/tasks",
        date: task.due_date,
      });
    }
  }

  for (const item of promo) {
    if (
      item.publish_date
      && dayStart(new Date(item.publish_date)) < today
      && !["published", "archived"].includes(item.status)
    ) {
      issues.push({
        id: `promo-${item.id}`,
        kind: "overdue_promo",
        severity: "warning",
        title: item.title,
        href: "/promo",
        date: item.publish_date,
      });
    }
  }

  for (const material of materials) {
    if (!criticalMaterialTypes.has(material.type)) continue;
    const backup = backupByMaterial.get(material.id);
    if (!backup || backup.status !== "ok") {
      issues.push({
        id: `backup-${material.id}`,
        kind: "missing_backup",
        severity: backup?.status === "problem" ? "critical" : "warning",
        title: `${material.song?.title ? `${material.song.title}: ` : ""}${material.title}`,
        href: `/songs/${material.song_id}`,
      });
    }
  }

  for (const event of events) {
    const days = daysUntil(event.starts_at, now);
    if (days < 0 || ["done", "cancelled", "archived"].includes(event.status)) continue;

    if (event.status === "announced" && !event.ticket_url) {
      issues.push({
        id: `ticket-${event.id}`,
        kind: "missing_ticket",
        severity: days <= 14 ? "critical" : "warning",
        title: event.title,
        href: `/events/${event.id}`,
        date: event.starts_at,
      });
    }
    if (days <= 14 && !setlistEventIds.has(event.id)) {
      issues.push({
        id: `setlist-${event.id}`,
        kind: "missing_setlist",
        severity: days <= 7 ? "critical" : "warning",
        title: event.title,
        href: `/events/${event.id}`,
        date: event.starts_at,
      });
    }
    if (days <= 10 && !event.tech_rider_file_id && !event.tech_rider_url && !riderFileEventIds.has(event.id)) {
      issues.push({
        id: `rider-${event.id}`,
        kind: "missing_rider",
        severity: days <= 5 ? "critical" : "warning",
        title: event.title,
        href: `/events/${event.id}`,
        date: event.starts_at,
      });
    }
    if (
      days <= 7
      && (!event.call_time || !event.soundcheck_time || !event.performance_time)
    ) {
      issues.push({
        id: `battle-sheet-${event.id}`,
        kind: "missing_battle_sheet",
        severity: days <= 3 ? "critical" : "warning",
        title: event.title,
        href: `/events/${event.id}/battle-sheet`,
        date: event.starts_at,
      });
    }
  }

  return issues.sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1;
    return (left.date ?? "9999").localeCompare(right.date ?? "9999");
  });
}
