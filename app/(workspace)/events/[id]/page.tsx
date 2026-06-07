import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { TaskCard } from "@/components/cards";
import { EventEditDialog } from "@/components/event-edit-dialog";
import { RedZone } from "@/components/red-zone";
import { TemplateTaskButton } from "@/components/template-task-button";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getProfile, getRedZoneIssues } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { Event, Task } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, profile, issues] = await Promise.all([
    createClient(),
    getProfile(),
    getRedZoneIssues(id),
  ]);
  const t = translator(profile.locale);
  if (!supabase) notFound();

  const [eventResult, tasksResult, setlistResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)")
      .eq("event_id", id)
      .order("due_date"),
    supabase
      .from("setlists")
      .select("*, items:setlist_items(*, song:songs(id,title))")
      .eq("event_id", id)
      .order("order_index", { referencedTable: "setlist_items" })
      .limit(1)
      .maybeSingle(),
  ]);
  if (eventResult.error || !eventResult.data) notFound();
  if (tasksResult.error) console.error("Supabase read event tasks error:", tasksResult.error);
  if (setlistResult.error) console.error("Supabase read event setlist error:", setlistResult.error);

  const event = eventResult.data as Event;
  const eventTasks = (tasksResult.data as Task[]) ?? [];
  const setlistItems = setlistResult.data?.items ?? [];
  const technicalLinks = [
    [profile.locale === "en" ? "Technical rider" : "Технический райдер", event.tech_rider_url],
    ["Stage plot", event.stage_plot_url],
    [profile.locale === "en" ? "Lighting timing" : "Световой тайминг", event.light_timing_url],
    [profile.locale === "en" ? "Video / intro" : "Видео / интро", event.video_timing_url],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return <>
    <Link href="/events" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("event.back")}
    </Link>
    <PageHeader
      eyebrow={profile.locale === "en" ? "Event" : "Концерт"}
      title={event.title}
      description={`${event.city} · ${event.venue ?? (profile.locale === "en" ? "Venue to be confirmed" : "Площадка уточняется")}`}
      action={<div className="flex flex-wrap items-start justify-end gap-2">
        <EventEditDialog event={event} setlistNotes={setlistResult.data?.notes} />
        <TemplateTaskButton eventId={id} />
        <Link href={`/events/${id}/battle-sheet`} className="button-primary">
          <ShieldAlert size={15} />{t("event.battleSheet")}
        </Link>
      </div>}
    />
    <div className="mb-7"><RedZone issues={issues} compact /></div>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-5">
        <div className="metal-card p-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={event.status} context="event" />
            <span className="text-sm text-zinc-400">{formatDate(event.starts_at, true, profile.locale)}</span>
          </div>
          <p className="mt-8 flex items-center gap-2 text-sm text-zinc-300"><MapPin size={15} className="text-zinc-600" />{event.city}, {event.venue ?? "—"}</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[[t("event.callTime"), event.call_time], [t("event.soundcheck"), event.soundcheck_time], [t("event.performance"), event.performance_time]].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white/[.025] p-3">
                <p className="text-[9px] uppercase text-zinc-700">{label}</p>
                <p className="mt-2 text-lg text-zinc-200">{value ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="metal-card p-6">
          <h2 className="font-display text-lg uppercase text-white">{t("event.technicalLinks")}</h2>
          {technicalLinks.map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={label} className="flex items-center justify-between border-b border-white/[.06] py-3 text-xs text-zinc-400 last:border-0 hover:text-white">{label}<ExternalLink size={13} /></a>)}
          {!technicalLinks.length && <p className="py-6 text-sm text-zinc-600">{t("common.noData")}</p>}
        </div>
      </div>
      <div>
        <h2 className="mb-3 font-display text-lg uppercase text-white">{t("event.preparation")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {eventTasks.map((task) => <TaskCard key={task.id} task={task} />)}
          {!eventTasks.length && <p className="metal-card col-span-full p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
        </div>
        <div className="mt-5 metal-card p-6">
          <h2 className="font-display text-lg uppercase text-white">{t("event.setlist")}</h2>
          <ol className="mt-4 divide-y divide-white/[.06]">
            {setlistItems.map((item: { id: string; order_index: number; live_version?: string | null; song?: { title: string } | null }) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <span className="w-6 text-xs text-zinc-700">{String(item.order_index + 1).padStart(2, "0")}</span>
                <span className="text-sm text-zinc-300">{item.song?.title ?? "—"}</span>
                {item.live_version && <span className="ml-auto text-[10px] text-zinc-700">{item.live_version}</span>}
              </li>
            ))}
            {!setlistItems.length && <li className="py-8 text-center text-sm text-zinc-600">{t("event.noSetlist")}</li>}
          </ol>
        </div>
      </div>
    </div>
  </>;
}
