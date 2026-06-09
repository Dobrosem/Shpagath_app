import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileDown,
  MapPin,
  Printer,
  ShieldAlert,
} from "lucide-react";
import { notFound } from "next/navigation";
import { TaskCard } from "@/components/cards";
import { RelatedContentCalendarPanel } from "@/components/content-calendar-components";
import { RelatedCopyPanel } from "@/components/copy-components";
import { EventEditDialog } from "@/components/event-edit-dialog";
import { EventTechRiderSelector } from "@/components/file-library-components";
import { RedZone } from "@/components/red-zone";
import { TemplateTaskButton } from "@/components/template-task-button";
import { StatusBadge } from "@/components/ui";
import { getAlbums, getCopyItems, getEpkProfiles, getEvents, getFileRecord, getProfile, getRedZoneIssues, getRelatedContentCalendarItems, getRelatedCopyItems, getSharedTechRiderFiles, getSongs } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getStorageDisplayUrl } from "@/lib/storage";
import type { Event, Task } from "@/lib/types";
import { getEventPosterUrl } from "@/lib/utils";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, profile, issues, relatedCopyItems, sharedTechRiders, allEvents, albums, songs, epks, copyItems, calendarItems] = await Promise.all([
    createClient(),
    getProfile(),
    getRedZoneIssues(id),
    getRelatedCopyItems("event_id", id),
    getSharedTechRiderFiles(),
    getEvents(),
    getAlbums(),
    getSongs(),
    getEpkProfiles(),
    getCopyItems("all"),
    getRelatedContentCalendarItems("event_id", id),
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
  const selectedTechRider = event.tech_rider_file_id ? await getFileRecord(event.tech_rider_file_id) : null;
  const posterUrl = getEventPosterUrl(event);
  const eventTasks = (tasksResult.data as Task[]) ?? [];
  const setlistItems = setlistResult.data?.items ?? [];
  const canEdit = ["admin", "member", "manager"].includes(profile.role);
  const locale = profile.locale === "en" ? "en-US" : "ru-RU";
  const startsAt = new Date(event.starts_at);
  const eventDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(startsAt);
  const eventTime = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
  const summaryItems = [
    [profile.locale === "en" ? "Date" : "Дата", eventDate],
    [profile.locale === "en" ? "Time" : "Время", eventTime],
    [profile.locale === "en" ? "City" : "Город", event.city],
    [profile.locale === "en" ? "Venue" : "Площадка", event.venue],
    [t("eventTiming.venueAddress"), event.venue_address],
    [profile.locale === "en" ? "Status" : "Статус", translateEnum(profile.locale, event.status, event.status, "event")],
  ] as const;
  const timingItems = [
    [t("eventTiming.arrival"), event.arrival_time],
    [t("eventTiming.loadIn"), event.load_in_time],
    [t("eventTiming.soundcheck"), event.soundcheck_time],
    [t("eventTiming.doors"), event.doors_time],
    [t("eventTiming.showStart"), event.show_start_time],
    [t("eventTiming.showEnd"), event.show_end_time],
    [t("eventTiming.curfew"), event.curfew_time],
    [t("eventTiming.backstageInfo"), event.backstage_info],
    [t("eventTiming.organizerContact"), event.organizer_contact],
    [t("eventTiming.soundEngineerContact"), event.sound_engineer_contact],
    [t("eventTiming.lightEngineerContact"), event.light_engineer_contact],
    [t("eventTiming.emergencyNotes"), event.emergency_notes],
  ] as const;
  const publicLinks = [
    [profile.locale === "en" ? "Tickets" : "Билеты", event.ticket_url],
    [profile.locale === "en" ? "VK event" : "Событие VK", event.vk_event_url],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return <>
    <Link href="/events" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("event.back")}
    </Link>

    <section className="metal-card relative mb-5 min-h-[320px] overflow-hidden sm:min-h-[380px]">
      {posterUrl
        ? <img src={posterUrl} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
        : <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,.11),transparent_42%),linear-gradient(135deg,#18181b,#050505_70%)]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />
      <div className="relative flex min-h-[320px] flex-col justify-between p-4 sm:min-h-[380px] sm:p-7">
        <div className="flex flex-wrap items-start justify-end gap-2">
          <EventEditDialog
            event={event}
            setlistNotes={setlistResult.data?.notes}
            triggerClassName="button-secondary min-h-10 border-white/15 bg-black/45 px-3 text-white backdrop-blur-md hover:bg-black/65"
          />
          <EventEditDialog
            event={event}
            setlistNotes={setlistResult.data?.notes}
            trigger="poster"
            triggerClassName="button-secondary min-h-10 border-white/15 bg-black/45 px-3 text-white backdrop-blur-md hover:bg-black/65"
          />
        </div>
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} context="event" />
            <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-300 backdrop-blur">
              {t("poster.title")}: {translateEnum(profile.locale, event.poster_status ?? "draft")}
            </span>
          </div>
          <h1 className="font-display text-4xl uppercase leading-none text-white sm:text-6xl">{event.title}</h1>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-200">
            <span className="inline-flex items-center gap-2"><CalendarDays size={15} />{eventDate}</span>
            <span className="inline-flex items-center gap-2"><Clock3 size={15} />{eventTime}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={15} />{[event.city, event.venue].filter(Boolean).join(" · ")}</span>
          </div>
          {event.poster_notes && <p className="mt-3 max-w-2xl text-xs leading-5 text-zinc-400">{event.poster_notes}</p>}
        </div>
      </div>
    </section>

    <div className="mb-5 flex flex-wrap gap-2">
      <TemplateTaskButton eventId={id} />
      <Link href={`/events/${id}/battle-sheet`} className="button-primary">
        <ShieldAlert size={15} />{t("event.battleSheet")}
      </Link>
    </div>
    <div className="mb-6"><RedZone issues={issues} compact /></div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-5">
        <section className="metal-card p-5 sm:p-6">
          <div>
            <p className="eyebrow">{t("common.summary")}</p>
            <h2 className="font-display text-xl uppercase text-white">{t("event.mainInformation")}</h2>
          </div>
          <dl className="mt-5 divide-y divide-white/[.06]">
            {summaryItems.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[130px_1fr] sm:gap-4">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-700">{label}</dt>
                <dd className="text-sm text-zinc-300">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          {publicLinks.length > 0 && <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[.06] pt-4">
            {publicLinks.map(([label, url]) => (
              <a href={url} target="_blank" rel="noreferrer" key={label} className="button-secondary min-h-10 px-3">
                {label}<ExternalLink size={13} />
              </a>
            ))}
          </div>}
          {event.description && <p className="mt-5 whitespace-pre-wrap border-t border-white/[.06] pt-4 text-sm leading-6 text-zinc-500">{event.description}</p>}
        </section>

        <section className="metal-card p-5 sm:p-6">
          <h2 className="font-display text-xl uppercase text-white">{t("eventTiming.title")}</h2>
          <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {timingItems.map(([label, value]) => (
              <div key={label} className="border-b border-white/[.06] py-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-700">{label}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <EventTechRiderSelector
          event={event}
          riders={sharedTechRiders}
          selectedRider={selectedTechRider}
          canEdit={canEdit}
        />

        <RelatedCopyPanel
          title={t("copy.eventCopy")}
          createLabel={t("copy.createEventCopy")}
          items={relatedCopyItems}
          options={{ events: allEvents, albums, songs, epks }}
          defaults={{ event_id: event.id, category: "concert_announcement" }}
        />
        <RelatedContentCalendarPanel
          title={t("contentCalendar.eventPlan")}
          createLabel={t("contentCalendar.schedulePost")}
          items={calendarItems}
          options={{ copyItems, events: allEvents, albums, songs, epks }}
          defaults={{ event_id: event.id, content_type: "announcement" }}
        />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg uppercase text-white">{t("event.preparation")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {eventTasks.map((task) => <TaskCard key={task.id} task={task} />)}
          {!eventTasks.length && <p className="metal-card col-span-full p-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
        </div>
        <div className="mt-5 metal-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase text-white">{t("setlistBuilder.title")}</h2>
            <div className="flex items-center gap-2">
              <Link
                href={`/events/${id}/setlist/print`}
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[.025] text-zinc-400 transition hover:border-white/20 hover:bg-white/[.05] hover:text-white"
                aria-label={t("printSetlist.printSetlist")}
                title={t("printSetlist.printSetlist")}
              >
                <Printer size={15} />
              </Link>
              <a
                href={`/events/${id}/setlist/pdf`}
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[.025] text-zinc-400 transition hover:border-white/20 hover:bg-white/[.05] hover:text-white"
                aria-label={t("printSetlist.downloadPdf")}
                title={t("printSetlist.downloadPdf")}
              >
                <FileDown size={15} />
              </a>
              <Link href={`/events/${id}/setlist`} className="button-secondary">
                {setlistItems.length ? t("setlistBuilder.edit") : t("setlistBuilder.build")}
              </Link>
            </div>
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
