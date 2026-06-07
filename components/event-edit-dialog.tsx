"use client";

import { AlertCircle, ImageIcon, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateEvent } from "@/app/actions";
import type { ActionState, Event } from "@/lib/types";
import { translateEnum } from "@/lib/i18n";
import { getEventPosterUrl } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

const initialState: ActionState = { success: false, error: null };

function eventDateParts(startsAt: string) {
  const date = new Date(startsAt);
  const value = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString();
  return { date: value.slice(0, 10), time: value.slice(11, 16) };
}

export function EventEditDialog({
  event,
  setlistNotes,
  trigger = "event",
  triggerClassName = "button-secondary",
}: {
  event: Event;
  setlistNotes?: string | null;
  trigger?: "event" | "poster";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dateParts, setDateParts] = useState({ date: "", time: "" });
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const router = useRouter();
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(
    updateEvent.bind(null, event.id),
    initialState,
  );
  const posterUrl = getEventPosterUrl(event);

  useEffect(() => {
    setDateParts(eventDateParts(event.starts_at));
    setTimezoneOffset(new Date().getTimezoneOffset());
  }, [event.starts_at]);

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    router.refresh();
  }, [router, state.success]);

  const label = (ru: string, en: string) => locale === "en" ? en : ru;
  const fields = [
    ["ticket_url", label("Ссылка на билеты", "Ticket URL"), "url"],
    ["vk_event_url", label("Событие VK", "VK event URL"), "url"],
    ["stage_plot_url", "Stage plot URL", "url"],
    ["tech_rider_url", label("Технический райдер", "Technical rider URL"), "url"],
    ["light_timing_url", label("Световой тайминг", "Lighting timing URL"), "url"],
    ["video_timing_url", label("Видео / интро", "Video / intro URL"), "url"],
    ["contact_person", label("Контактное лицо", "Contact person"), "text"],
    ["contact_phone", label("Телефон", "Contact phone"), "text"],
    ["contact_email", "Email", "email"],
  ] as const;
  const timingFields = [
    ["venue_address", t("eventTiming.venueAddress")],
    ["arrival_time", t("eventTiming.arrival")],
    ["load_in_time", t("eventTiming.loadIn")],
    ["soundcheck_time", t("eventTiming.soundcheck")],
    ["doors_time", t("eventTiming.doors")],
    ["show_start_time", t("eventTiming.showStart")],
    ["show_end_time", t("eventTiming.showEnd")],
    ["curfew_time", t("eventTiming.curfew")],
    ["organizer_contact", t("eventTiming.organizerContact")],
    ["sound_engineer_contact", t("eventTiming.soundEngineerContact")],
    ["light_engineer_contact", t("eventTiming.lightEngineerContact")],
  ] as const;
  const preservedEventFields = [
    "venue",
    "ticket_url",
    "vk_event_url",
    "description",
    "tech_notes",
    "stage_plot_url",
    "tech_rider_url",
    "light_timing_url",
    "video_timing_url",
    "contact_person",
    "contact_phone",
    "contact_email",
    "arrival_time",
    "load_in_time",
    "soundcheck_time",
    "doors_time",
    "show_start_time",
    "show_end_time",
    "curfew_time",
    "backstage_info",
    "venue_address",
    "organizer_contact",
    "sound_engineer_contact",
    "light_engineer_contact",
    "emergency_notes",
  ] as const;
  const posterEditor = trigger === "poster";

  return <>
    <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
      {posterEditor ? <ImageIcon size={15} /> : <Pencil size={15} />}
      {posterEditor ? t("event.editPoster") : t("event.editEvent")}
    </button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className={`metal-card max-h-[92vh] w-full overflow-y-auto p-6 ${posterEditor ? "max-w-2xl" : "max-w-3xl"}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="eyebrow">{posterEditor ? t("poster.title") : t("common.edit")}</p>
            <h2 className="font-display text-2xl uppercase text-white">{posterEditor ? t("event.editPoster") : t("event.editEvent")}</h2>
          </div>
          <button type="button" aria-label={t("common.close")} disabled={pending} onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white"><X /></button>
        </div>
        {posterEditor
          ? <form action={action} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="timezone_offset" value={timezoneOffset} />
              <input type="hidden" name="title" value={event.title} />
              <input type="hidden" name="city" value={event.city} />
              <input type="hidden" name="date" value={dateParts.date} />
              <input type="hidden" name="time" value={dateParts.time} />
              <input type="hidden" name="status" value={event.status} />
              <input type="hidden" name="setlist_notes" value={setlistNotes ?? ""} />
              {preservedEventFields.map((name) => <input key={name} type="hidden" name={name} value={String(event[name] ?? "")} />)}
              <div className="overflow-hidden rounded-xl border border-white/[.08] bg-black/25 sm:col-span-2">
                {posterUrl
                  ? <img src={posterUrl} alt={event.title} className="max-h-80 w-full object-contain" />
                  : <div className="grid min-h-48 place-items-center text-center text-zinc-600">
                      <div><ImageIcon className="mx-auto" size={34} /><p className="mt-3 text-sm">{t("poster.empty")}</p></div>
                    </div>}
              </div>
              <label><span className="label">{event.poster_image_url ? t("poster.replace") : t("poster.upload")}</span><input className="field py-2" type="file" name="poster_file" accept="image/*" /></label>
              <label><span className="label">URL</span><input className="field" type="url" name="poster_image_url" defaultValue={event.poster_image_url ?? ""} /></label>
              <label><span className="label">{t("poster.status")}</span>
                <select className="field" name="poster_status" defaultValue={event.poster_status ?? "draft"}>
                  {["draft", "review", "approved", "outdated", "archived"].map((status) => (
                    <option key={status} value={status}>{translateEnum(locale, status)}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2"><span className="label">{t("poster.notes")}</span><textarea className="field min-h-20 py-3" name="poster_notes" defaultValue={event.poster_notes ?? ""} /></label>
              {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} className="shrink-0" />{state.error}</div>}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                {event.poster_image_url && <button type="submit" name="remove_poster" value="true" className="button-secondary border-red-500/20 text-red-300" disabled={pending}>
                  <Trash2 size={14} />{t("poster.remove")}
                </button>}
                <div className="ml-auto flex gap-2">
                  <button disabled={pending} type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
                  <button disabled={pending} className="button-primary">{pending && <Loader2 size={14} className="animate-spin" />}{!pending && <Upload size={14} />}{pending ? t("common.saving") : t("common.save")}</button>
                </div>
              </div>
            </form>
          : <form action={action} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="timezone_offset" value={timezoneOffset} />
              <input type="hidden" name="poster_image_url" value={event.poster_image_url ?? ""} />
              <input type="hidden" name="poster_status" value={event.poster_status ?? "draft"} />
              <input type="hidden" name="poster_notes" value={event.poster_notes ?? ""} />
              <label><span className="label">{label("Название", "Title")}</span><input className="field" name="title" required defaultValue={event.title} /></label>
              <label><span className="label">{label("Город", "City")}</span><input className="field" name="city" required defaultValue={event.city} /></label>
              <label><span className="label">{label("Площадка", "Venue")}</span><input className="field" name="venue" defaultValue={event.venue ?? ""} /></label>
              <label><span className="label">{label("Статус", "Status")}</span>
                <select className="field" name="status" required defaultValue={event.status}>
                  {["planned", "announced", "in_progress", "done", "cancelled", "archived"].map((status) => (
                    <option key={status} value={status}>{translateEnum(locale, status, status, "event")}</option>
                  ))}
                </select>
              </label>
              <label><span className="label">{label("Дата", "Date")}</span><input className="field" type="date" name="date" required value={dateParts.date} onChange={(event) => setDateParts((current) => ({ ...current, date: event.target.value }))} /></label>
              <label><span className="label">{label("Время", "Time")}</span><input className="field" type="time" name="time" required value={dateParts.time} onChange={(event) => setDateParts((current) => ({ ...current, time: event.target.value }))} /></label>
              {fields.map(([name, fieldLabel, type]) => <label key={name}><span className="label">{fieldLabel}</span><input className="field" name={name} type={type} defaultValue={String(event[name] ?? "")} /></label>)}
              <div className="border-t border-white/[.08] pt-5 sm:col-span-2">
                <p className="font-display text-lg uppercase text-white">{t("eventTiming.title")}</p>
              </div>
              {timingFields.map(([name, fieldLabel]) => <label key={name}><span className="label">{fieldLabel}</span><input className="field" name={name} defaultValue={event[name] ?? ""} /></label>)}
              <label className="sm:col-span-2"><span className="label">{t("eventTiming.backstageInfo")}</span><textarea className="field min-h-20 py-3" name="backstage_info" defaultValue={event.backstage_info ?? ""} /></label>
              <label className="sm:col-span-2"><span className="label">{t("eventTiming.emergencyNotes")}</span><textarea className="field min-h-20 py-3" name="emergency_notes" defaultValue={event.emergency_notes ?? ""} /></label>
              <label className="sm:col-span-2"><span className="label">{label("Описание", "Description")}</span><textarea className="field min-h-24 py-3" name="description" defaultValue={event.description ?? ""} /></label>
              <label className="sm:col-span-2"><span className="label">{t("eventTiming.textSetlist")}</span><textarea className="field min-h-20 py-3" name="setlist_notes" defaultValue={setlistNotes ?? ""} placeholder={t("eventTiming.textSetlist")} /></label>
              <label className="sm:col-span-2"><span className="label">{label("Технические заметки", "Technical notes")}</span><textarea className="field min-h-24 py-3" name="tech_notes" defaultValue={event.tech_notes ?? ""} /></label>
              {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} className="shrink-0" />{state.error}</div>}
              <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
                <button disabled={pending} type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
                <button disabled={pending} className="button-primary">{pending && <Loader2 size={14} className="animate-spin" />}{!pending && <Upload size={14} />}{pending ? t("common.saving") : t("common.save")}</button>
              </div>
            </form>}
      </div>
    </div>}
  </>;
}
