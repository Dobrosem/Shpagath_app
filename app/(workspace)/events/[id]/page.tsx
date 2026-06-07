import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { TaskCard } from "@/components/cards";
import { EventEditDialog } from "@/components/event-edit-dialog";
import { RedZone } from "@/components/red-zone";
import { TemplateTaskButton } from "@/components/template-task-button";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getProfile, getRedZoneIssues } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getStorageDisplayUrl } from "@/lib/storage";
import type { Event, Task } from "@/lib/types";
import { formatDate, getEventPosterUrl } from "@/lib/utils";

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
      .select("*, items:setlist_items(*, song:songs(id,title,bpm,key,tuning))")
      .eq("event_id", id)
      .order("order_index", { referencedTable: "setlist_items" })
      .limit(1)
      .maybeSingle(),
  ]);
  if (eventResult.error || !eventResult.data) notFound();
  if (tasksResult.error) console.error("Supabase read event tasks error:", tasksResult.error);
  if (setlistResult.error) console.error("Supabase read event setlist error:", setlistResult.error);

  const event = {
    ...(eventResult.data as Event),
    poster_display_url: await getStorageDisplayUrl(
      supabase,
      "event-posters",
      eventResult.data.poster_image_url,
    ),
  };
  const posterUrl = getEventPosterUrl(event);
  const eventTasks = (tasksResult.data as Task[]) ?? [];
  const setlistItems = setlistResult.data?.items ?? [];
  const technicalLinks = [
    [profile.locale === "en" ? "Technical rider" : "Технический райдер", event.tech_rider_url],
    ["Stage plot", event.stage_plot_url],
    [profile.locale === "en" ? "Lighting timing" : "Световой тайминг", event.light_timing_url],
    [profile.locale === "en" ? "Video / intro" : "Видео / интро", event.video_timing_url],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const eventOverview = [
    [profile.locale === "en" ? "Date" : "Дата", formatDate(event.starts_at, true, profile.locale)],
    [profile.locale === "en" ? "City" : "Город", event.city],
    [profile.locale === "en" ? "Venue" : "Площадка", event.venue],
    [t("eventTiming.venueAddress"), event.venue_address],
    [t("eventTiming.arrival"), event.arrival_time],
    [t("eventTiming.soundcheck"), event.soundcheck_time],
    [t("eventTiming.doors"), event.doors_time],
    [t("eventTiming.showStart"), event.show_start_time],
  ] as const;

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
        <div className="metal-card overflow-hidden">
          {posterUrl
            ? <img src={posterUrl} alt={event.title} className="aspect-[4/3] w-full object-cover" />
            : <div className="grid min-h-44 place-items-center p-6 text-center text-sm text-zinc-600">{t("poster.empty")}</div>}
          <div className="border-t border-white/[.06] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-lg uppercase text-white">{t("poster.title")}</span>
              <StatusBadge status={event.poster_status ?? "draft"} />
            </div>
            {event.poster_notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{event.poster_notes}</p>}
          </div>
        </div>
        <div className="metal-card p-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={event.status} context="event" />
            <span className="text-xs uppercase tracking-wider text-zinc-600">{t("eventTiming.title")}</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {eventOverview.map(([label, value]) => (
              <div key={label} className="min-h-20 rounded-lg bg-white/[.025] p-3">
                <p className="text-[9px] uppercase text-zinc-700">{label}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{value || "—"}</p>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase text-white">{t("setlistBuilder.title")}</h2>
            <Link href={`/events/${id}/setlist`} className="button-secondary">
              {setlistItems.length ? t("setlistBuilder.edit") : t("setlistBuilder.build")}
            </Link>
          </div>
          <ol className="mt-4 divide-y divide-white/[.06]">
            {setlistItems.map((item: { id: string; order_index: number; live_version?: string | null; notes?: string | null; song?: { title: string; bpm?: number | null; key?: string | null; tuning?: string | null } | null }) => (
              <li key={item.id} className="flex items-start gap-4 py-3">
                <span className="w-6 text-xs text-zinc-700">{String(item.order_index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-zinc-300">{item.song?.title ?? "—"}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-zinc-700">
                    {[item.song?.bpm && `${item.song.bpm} BPM`, item.song?.key, item.song?.tuning].filter(Boolean).join(" · ") || "—"}
                  </span>
                  {item.notes && <span className="mt-1 block text-xs text-zinc-600">{item.notes}</span>}
                </span>
                {item.live_version && <span className="ml-auto text-[10px] text-zinc-600">{item.live_version}</span>}
              </li>
            ))}
            {!setlistItems.length && <li className="py-8 text-center text-sm text-zinc-600">{t("event.noSetlist")}</li>}
          </ol>
        </div>
      </div>
    </div>
  </>;
}
