import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Printer,
  ShieldAlert,
} from "lucide-react";
import { notFound } from "next/navigation";
import { RedZone } from "@/components/red-zone";
import { StatusBadge } from "@/components/ui";
import { getFileRecord, getProfile, getRedZoneIssues } from "@/lib/data";
import { translateEnum, translator } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { Event, Material } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const battleMaterialTypes = [
  "backing_track",
  "click_track",
  "stems",
  "live_version_audio",
  "live_version_video",
  "tech_notes",
  "orchestral_score",
  "orchestral_parts",
];

interface SetlistItem {
  id: string;
  order_index: number;
  live_version?: string | null;
  notes?: string | null;
  song_id: string;
  song?: { id: string; title: string } | null;
}

interface Setlist {
  id: string;
  title: string;
  notes?: string | null;
  items?: SetlistItem[];
}

export default async function BattleSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, profile, issues] = await Promise.all([
    createClient(),
    getProfile(),
    getRedZoneIssues(id),
  ]);
  if (!supabase) notFound();
  const t = translator(profile.locale);
  const unspecified = t("battleSheet.notSpecified");

  const [eventResult, setlistResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("setlists")
      .select("id,title,notes,items:setlist_items(id,order_index,live_version,notes,song_id,song:songs(id,title))")
      .eq("event_id", id)
      .order("order_index", { referencedTable: "setlist_items" })
      .limit(1)
      .maybeSingle(),
  ]);
  if (eventResult.error || !eventResult.data) {
    console.error("Supabase read battle sheet event error:", eventResult.error);
    notFound();
  }
  if (setlistResult.error) {
    console.error("Supabase read battle sheet setlist error:", setlistResult.error);
  }

  const event = eventResult.data as Event;
  const selectedTechRider = event.tech_rider_file_id ? await getFileRecord(event.tech_rider_file_id) : null;
  const activeTechRider = selectedTechRider?.status === "archived" ? null : selectedTechRider;
  const setlist = (setlistResult.data as Setlist | null) ?? null;
  const setlistItems = setlist?.items ?? [];
  const songIds = [...new Set(setlistItems.map((item) => item.song_id))];
  let materials: (Material & { song?: { title: string } | null })[] = [];

  if (songIds.length) {
    const materialsResult = await supabase
      .from("song_materials")
      .select("*, song:songs(title)")
      .in("song_id", songIds)
      .in("type", battleMaterialTypes)
      .order("song_id")
      .order("type");
    if (materialsResult.error) {
      console.error("Supabase read battle sheet materials error:", materialsResult.error);
    } else {
      materials = (materialsResult.data as (Material & { song?: { title: string } | null })[]) ?? [];
    }
  }

  const start = new Date(event.starts_at);
  const startTime = Number.isNaN(start.getTime())
    ? t("battleSheet.timeNotSpecified")
    : new Intl.DateTimeFormat(profile.locale === "en" ? "en-US" : "ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(start);
  const technicalDocuments = [
    [t("battleSheet.rider"), activeTechRider?.display_url ?? activeTechRider?.external_url ?? event.tech_rider_url],
    [t("battleSheet.stagePlot"), event.stage_plot_url],
    [t("battleSheet.lightTiming"), event.light_timing_url],
    [t("battleSheet.videoTiming"), event.video_timing_url],
  ] as const;
  const eventLinks = [
    [profile.locale === "en" ? "Tickets" : "Билеты", event.ticket_url],
    [profile.locale === "en" ? "VK event" : "Событие VK", event.vk_event_url],
  ] as const;
  const timingRows = [
    [t("eventTiming.venueAddress"), event.venue_address],
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

  return <div className="mx-auto max-w-6xl">
    <Link href={`/events/${id}`} className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("battleSheet.backToEvent")}
    </Link>

    <header className="mb-7 border-b border-white/10 pb-7">
      <p className="eyebrow flex items-center gap-2"><ShieldAlert size={13} />{t("battleSheet.title")}</p>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl uppercase text-white sm:text-5xl">{event.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{event.city || unspecified} · {event.venue || unspecified}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(event.starts_at, false, profile.locale)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{startTime}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/events/${id}/setlist/print`} className="button-secondary">
            <Printer size={14} />{t("printSetlist.printSetlist")}
          </Link>
          <StatusBadge status={event.status} context="event" />
        </div>
      </div>
    </header>

    {!!issues.length && <div className="mb-7"><RedZone issues={issues} compact /></div>}

    <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="metal-card p-6">
        <h2 className="font-display text-xl uppercase text-white">{t("battleSheet.mainInformation")}</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            [profile.locale === "en" ? "Date" : "Дата", formatDate(event.starts_at, false, profile.locale)],
            [profile.locale === "en" ? "Time" : "Время", startTime],
            [profile.locale === "en" ? "City" : "Город", event.city || unspecified],
            [profile.locale === "en" ? "Venue" : "Площадка", event.venue || unspecified],
          ].map(([label, value]) => <div key={label} className="rounded-lg bg-white/[.025] p-4">
            <dt className="text-[9px] uppercase tracking-widest text-zinc-700">{label}</dt>
            <dd className="mt-2 text-sm text-zinc-200">{value}</dd>
          </div>)}
        </dl>
        {event.description && <div className="mt-5 border-t border-white/[.06] pt-5">
          <p className="text-[9px] uppercase tracking-widest text-zinc-700">{profile.locale === "en" ? "Description" : "Описание"}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{event.description}</p>
        </div>}
        {event.tech_notes && <div className="mt-5 border-t border-white/[.06] pt-5">
          <p className="text-[9px] uppercase tracking-widest text-zinc-700">{profile.locale === "en" ? "Technical notes" : "Технические заметки"}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-500">{event.tech_notes}</p>
        </div>}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[.06] pt-5">
          {eventLinks.map(([label, url]) => url
            ? <a key={label} href={url} target="_blank" rel="noreferrer" className="button-secondary">{label}<ExternalLink size={13} /></a>
            : <span key={label} className="inline-flex h-10 items-center rounded-lg border border-white/[.06] px-4 text-xs text-zinc-700">{label}: {unspecified}</span>)}
        </div>
      </div>

      <div className="metal-card p-6">
        <h2 className="font-display text-xl uppercase text-white">{t("eventTiming.title")}</h2>
        <div className="mt-5 divide-y divide-white/[.06]">
          {timingRows.map(([label, value]) => <div className="py-3 first:pt-0 last:pb-0" key={label}>
            <p className="text-[9px] uppercase tracking-widest text-zinc-700">{label}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{value || unspecified}</p>
          </div>)}
        </div>
      </div>
    </section>

    <section className="mt-5 metal-card p-6">
      <h2 className="font-display text-xl uppercase text-white">{t("battleSheet.setlist")}</h2>
      {!!setlistItems.length ? <ol className="mt-4 divide-y divide-white/[.06]">
        {setlistItems.map((item) => <li className="flex gap-4 py-4" key={item.id}>
          <span className="w-7 shrink-0 text-xs text-ember">{String(item.order_index + 1).padStart(2, "0")}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-200">{item.song?.title ?? unspecified}</p>
            {(item.live_version || item.notes) && <p className="mt-1 text-xs text-zinc-600">
              {[item.live_version, item.notes].filter(Boolean).join(" · ")}
            </p>}
          </div>
        </li>)}
      </ol> : setlist?.notes ? <div className="mt-5">
        <p className="text-[9px] uppercase tracking-widest text-zinc-700">{t("eventTiming.textSetlist")}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{setlist.notes}</p>
      </div> : <p className="mt-5 text-sm text-zinc-600">{t("battleSheet.setlistEmpty")}</p>}
    </section>

    {!!materials.length && <section className="mt-5 metal-card p-6">
      <h2 className="font-display text-xl uppercase text-white">{t("battleSheet.materials")}</h2>
      <div className="mt-4 divide-y divide-white/[.06]">
        {materials.map((material) => <div key={material.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-200">{material.title}</p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {material.song?.title ? `${material.song.title} · ` : ""}
              {translateEnum(profile.locale, material.type)}
            </p>
          </div>
          <StatusBadge status={material.status} />
          {material.url
            ? <a href={material.url} target="_blank" rel="noreferrer" className="button-secondary">{t("battleSheet.open")}<ExternalLink size={13} /></a>
            : <span className="text-xs text-zinc-600">{t("battleSheet.noLink")}</span>}
        </div>)}
      </div>
    </section>}

    <section className="mt-5 grid gap-5 md:grid-cols-2">
      <div className="metal-card p-6">
        <h2 className="font-display text-xl uppercase text-white">{t("battleSheet.technicalDocuments")}</h2>
        <div className="mt-4 divide-y divide-white/[.06]">
          {technicalDocuments.map(([label, url]) => <div key={label} className="flex items-center justify-between gap-4 py-4">
            <span className="text-sm text-zinc-300">{label}</span>
            {url
              ? <a href={url} target="_blank" rel="noreferrer" className="button-secondary">{t("battleSheet.open")}<ExternalLink size={13} /></a>
              : <span className="text-xs text-zinc-600">{unspecified}</span>}
          </div>)}
        </div>
      </div>

      <div className="metal-card p-6">
        <h2 className="font-display text-xl uppercase text-white">{t("battleSheet.contacts")}</h2>
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-700">{profile.locale === "en" ? "Contact person" : "Контактное лицо"}</p>
            <p className="mt-1 text-sm text-zinc-200">{event.contact_person || unspecified}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-700">{profile.locale === "en" ? "Phone" : "Телефон"}</p>
            {event.contact_phone
              ? <a href={`tel:${event.contact_phone}`} className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-200 hover:text-white"><Phone size={14} />{event.contact_phone}</a>
              : <p className="mt-1 text-sm text-zinc-600">{unspecified}</p>}
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-700">Email</p>
            {event.contact_email
              ? <a href={`mailto:${event.contact_email}`} className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-200 hover:text-white"><Mail size={14} />{event.contact_email}</a>
              : <p className="mt-1 text-sm text-zinc-600">{unspecified}</p>}
          </div>
        </div>
      </div>
    </section>
  </div>;
}
