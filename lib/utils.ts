import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Album, Event, Song } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null, includeTime = false, locale = "ru") {
  if (!value) return locale === "en" ? "Not scheduled" : "Не назначено";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

export function formatDuration(totalSeconds?: number | null) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const rounded = Math.floor(totalSeconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function getPublicMediaUrl(value: string | null | undefined, bucket: string) {
  const source = value?.trim();
  if (!source) return null;
  if (/^(https?:|data:|blob:)/i.test(source) || source.startsWith("/")) return source;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!supabaseUrl) return source;
  const objectPath = source.replace(/^\/+/, "").replace(new RegExp(`^${bucket}/`), "");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

function getExternalOrLocalMediaUrl(value: string | null | undefined) {
  const source = value?.trim();
  if (!source) return null;
  if (/^(data:|blob:)/i.test(source) || source.startsWith("/")) return source;
  if (!/^https?:\/\//i.test(source)) return null;
  try {
    const url = new URL(source);
    if (url.pathname.includes("/storage/v1/object/")) return null;
    return source;
  } catch {
    return null;
  }
}

export function getSongDisplayCover(song: Pick<Song, "cover_image_url" | "cover_display_url">) {
  // Album cover fallback can be added here later without changing song cards.
  return song.cover_display_url || getPublicMediaUrl(song.cover_image_url, "song-covers");
}

export function getAlbumCoverUrl(album: Pick<Album, "cover_image_url" | "cover_display_url">) {
  return album.cover_display_url || getExternalOrLocalMediaUrl(album.cover_image_url);
}

export function getSongResolvedCover(
  song: Pick<Song, "cover_image_url" | "cover_display_url" | "album">,
) {
  return song.album ? getAlbumCoverUrl(song.album) || getSongDisplayCover(song) : getSongDisplayCover(song);
}

export function getEventPosterUrl(event: Pick<Event, "poster_image_url" | "poster_display_url">) {
  return event.poster_display_url || getPublicMediaUrl(event.poster_image_url, "event-posters");
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
