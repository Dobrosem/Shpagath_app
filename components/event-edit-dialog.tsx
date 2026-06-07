"use client";

import { AlertCircle, Loader2, Pencil, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateEvent } from "@/app/actions";
import type { ActionState, Event } from "@/lib/types";
import { translateEnum } from "@/lib/i18n";
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
}: {
  event: Event;
  setlistNotes?: string | null;
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

  return <>
    <button type="button" className="button-secondary" onClick={() => setOpen(true)}>
      <Pencil size={15} />{t("event.edit")}
    </button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("common.edit")}</p><h2 className="font-display text-2xl uppercase text-white">{t("event.edit")}</h2></div>
          <button type="button" aria-label={t("common.close")} disabled={pending} onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white"><X /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="timezone_offset" value={timezoneOffset} />
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
            <button disabled={pending} className="button-primary">{pending && <Loader2 size={14} className="animate-spin" />}{pending ? t("common.saving") : t("common.save")}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}
