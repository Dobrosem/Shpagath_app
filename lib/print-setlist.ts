import { existsSync } from "fs";
import { join } from "path";
import type { Event, Locale, Material } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const printMaterialTypes = [
  "backing_track",
  "click_track",
  "stems",
  "tech_notes",
  "orchestral_score",
  "orchestral_parts",
];

export interface PrintSong {
  id: string;
  title: string;
  bpm?: number | null;
  key?: string | null;
  tuning?: string | null;
  duration?: number | null;
  album?: { id: string; title: string } | null;
}

export interface PrintSetlistItem {
  id: string;
  order_index: number;
  live_version?: string | null;
  notes?: string | null;
  song_id: string;
  song?: PrintSong | null;
}

export interface PrintSetlist {
  id: string;
  title: string;
  notes?: string | null;
  items?: PrintSetlistItem[];
}

export interface PrintableSetlistData {
  event: Event;
  setlist: PrintSetlist | null;
  setlistItems: PrintSetlistItem[];
  materials: (Material & { song?: { title: string } | null })[];
  locale: Locale;
  eventTime: string | null;
  eventMeta: string[];
  timingMeta: string[];
}

type SupabaseLike = {
  from: (table: string) => any;
};
const PRINT_SETLIST_DB_TIMEOUT_MS = 8000;

function withPrintSetlistTimeout<T>(promise: PromiseLike<T>, timeoutMs = PRINT_SETLIST_DB_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function reportPrintSetlistError(entity: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(`Supabase read printable setlist ${entity} error:`, String(error ?? "Unknown error"));
    return;
  }
  const typedError = error as { code?: string | null; message?: string | null; name?: string | null; status?: number | null };
  console.error(`Supabase read printable setlist ${entity} error:`, {
    code: typedError.code ?? null,
    message: typedError.message ?? typedError.name ?? "Unknown error",
    status: typedError.status ?? null,
  });
}

async function safePrintSetlistQuery<T>(entity: string, query: PromiseLike<T>, fallback: T): Promise<T> {
  try {
    return await withPrintSetlistTimeout(query);
  } catch (error) {
    reportPrintSetlistError(entity, error);
    return fallback;
  }
}

export function getLogoSrc() {
  if (existsSync(getLogoPath("saphath-logo.svg"))) return "/branding/saphath-logo.svg";
  if (existsSync(getLogoPath("saphath-logo.png"))) return "/branding/saphath-logo.png";
  return null;
}

export function getLogoFilePath() {
  const svgPath = getLogoPath("saphath-logo.svg");
  if (existsSync(svgPath)) return svgPath;
  const pngPath = getLogoPath("saphath-logo.png");
  if (existsSync(pngPath)) return pngPath;
  return null;
}

function getLogoPath(fileName: string) {
  return join(process.cwd(), "public", "branding", fileName);
}

export function formatSetlistTime(value: string | null | undefined, locale: Locale) {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) return value;
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function safeSetlistFilename(event: Event) {
  const date = event.starts_at ? event.starts_at.slice(0, 10) : "undated";
  const title = `${event.title || event.city || "event"}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `saphath-setlist-${title || "event"}-${date}.pdf`;
}

export async function getPrintableSetlistData({
  supabase,
  eventId,
  locale,
  labels,
}: {
  supabase: SupabaseLike;
  eventId: string;
  locale: Locale;
  labels: {
    soundcheck: string;
    doors: string;
    showStart: string;
  };
}): Promise<PrintableSetlistData | null> {
  const [eventResult, setlistResult] = await Promise.all([
    safePrintSetlistQuery(
      "event",
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      { data: null, error: null },
    ),
    safePrintSetlistQuery(
      "setlist",
      supabase
        .from("setlists")
        .select("id,title,notes,items:setlist_items(id,order_index,live_version,notes,song_id,song:songs(id,title,bpm,key,tuning,duration,album:albums(id,title)))")
        .eq("event_id", eventId)
        .order("order_index", { referencedTable: "setlist_items" })
        .limit(1)
        .maybeSingle(),
      { data: null, error: null },
    ),
  ]);

  if (eventResult.error || !eventResult.data) {
    reportPrintSetlistError("event", eventResult.error);
    return null;
  }
  if (setlistResult.error) {
    reportPrintSetlistError("setlist", setlistResult.error);
  }

  const event = eventResult.data as Event;
  const setlist = (setlistResult.data as PrintSetlist | null) ?? null;
  const setlistItems = [...(setlist?.items ?? [])].sort((a, b) => a.order_index - b.order_index);
  const songIds = [...new Set(setlistItems.map((item) => item.song_id))];
  let materials: (Material & { song?: { title: string } | null })[] = [];

  if (songIds.length) {
    const materialsResult = await safePrintSetlistQuery(
      "materials",
      supabase
        .from("song_materials")
        .select("*, song:songs(title)")
        .in("song_id", songIds)
        .in("type", printMaterialTypes)
        .order("song_id")
        .order("type"),
      { data: [], error: null },
    );
    if (materialsResult.error) {
      reportPrintSetlistError("materials", materialsResult.error);
    } else {
      materials = (materialsResult.data as (Material & { song?: { title: string } | null })[]) ?? [];
    }
  }

  const eventStart = new Date(event.starts_at);
  const eventTime = Number.isNaN(eventStart.getTime())
    ? null
    : new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(eventStart);
  const eventMeta = [
    event.title,
    event.city,
    event.venue,
    formatDate(event.starts_at, false, locale),
    eventTime,
  ].filter(Boolean) as string[];
  const timingMeta = [
    event.soundcheck_time ? `${labels.soundcheck}: ${formatSetlistTime(event.soundcheck_time, locale)}` : null,
    event.doors_time ? `${labels.doors}: ${formatSetlistTime(event.doors_time, locale)}` : null,
    event.show_start_time ? `${labels.showStart}: ${formatSetlistTime(event.show_start_time, locale)}` : null,
  ].filter(Boolean) as string[];

  return {
    event,
    setlist,
    setlistItems,
    materials,
    locale,
    eventTime,
    eventMeta,
    timingMeta,
  };
}
