"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

type SongTab = "overview" | "materials" | "tasks" | "notes" | "live" | "backups" | "cover";

export function SongDetailTabs({
  overview,
  materials,
  tasks,
  notes,
  live,
  backups,
  cover,
}: {
  overview: React.ReactNode;
  materials: React.ReactNode;
  tasks: React.ReactNode;
  notes: React.ReactNode;
  live: React.ReactNode;
  backups: React.ReactNode;
  cover: React.ReactNode;
}) {
  const [active, setActive] = useState<SongTab>("overview");
  const { t } = useI18n();
  const tabs: { id: SongTab; label: string }[] = [
    { id: "overview", label: t("song.overview") },
    { id: "materials", label: t("song.materials") },
    { id: "tasks", label: t("song.tasks") },
    { id: "notes", label: t("song.notes") },
    { id: "live", label: t("song.liveVersion") },
    { id: "backups", label: t("song.backups") },
    { id: "cover", label: t("cover.title") },
  ];
  const content = { overview, materials, tasks, notes, live, backups, cover };

  return <>
    <div className="mb-7 flex flex-wrap gap-2" role="tablist">
      {tabs.map((tab) => <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={active === tab.id}
        onClick={() => setActive(tab.id)}
        className={cn(active === tab.id ? "button-primary" : "button-secondary")}
      >
        {tab.label}
      </button>)}
    </div>
    <div role="tabpanel">{content[active]}</div>
  </>;
}
