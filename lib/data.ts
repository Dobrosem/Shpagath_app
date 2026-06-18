import { cache } from "react";
import { createClient } from "./supabase/server";
import { demoProfile, events, people, projects, songs, tasks } from "./demo-data";
import { buildRedZoneIssues, criticalMaterialTypes } from "./red-zone";
import { getStorageDisplayUrl, getStoragePreviewUrl } from "./storage";
import type {
  Album,
  Contact,
  ContentCalendarItem,
  CopyItem,
  CopyStatus,
  Event,
  EpkProfile,
  EventSetlist,
  FileRecord,
  FinanceRecord,
  Material,
  MaterialBackup,
  PackingList,
  Profile,
  Project,
  PromoMaterial,
  RedZoneIssue,
  Rehearsal,
  Song,
  Task,
  TaskTemplate,
} from "./types";

function reportReadError(entity: string, error: unknown) {
  if (!error) return;
  if (typeof error === "object") {
    const typedError = error as {
      code?: string | null;
      details?: string | null;
      hint?: string | null;
      message?: string | null;
      name?: string | null;
      status?: number | null;
    };
    console.error(`Supabase read ${entity} error:`, {
      code: typedError.code ?? null,
      details: typedError.details ?? null,
      hint: typedError.hint ?? null,
      message: typedError.message ?? null,
      name: typedError.name ?? null,
      status: typedError.status ?? null,
    });
    return;
  }
  console.error(`Supabase read ${entity} error:`, error);
}

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;
type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};
const AUTH_USER_TIMEOUT_MS = 3000;
const DB_READ_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function mapSettled<T, U>(
  items: T[],
  entity: string,
  mapper: (item: T) => Promise<U>,
): Promise<U[]> {
  const results = await Promise.allSettled(items.map(mapper));
  return results.flatMap((result) => {
    if (result.status === "fulfilled") return [result.value];
    reportReadError(entity, result.reason);
    return [];
  });
}

export async function safeSupabaseQuery<T>(
  entity: string,
  query: PromiseLike<T>,
  fallback: unknown,
  timeoutMs = DB_READ_TIMEOUT_MS,
): Promise<T> {
  try {
    return await withTimeout(Promise.resolve(query), timeoutMs);
  } catch (error) {
    reportReadError(entity, error);
    return fallback as T;
  }
}

const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  try {
    const result = await withTimeout(supabase.auth.getUser(), AUTH_USER_TIMEOUT_MS);
    if (result.error || !result.data.user) {
      reportReadError("auth user", result.error);
      return null;
    }
    return result.data.user;
  } catch (error) {
    reportReadError("auth user", error);
    return null;
  }
});

export const getProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  if (!supabase) return demoProfile;
  const user = await getCurrentUser();
  if (!user) {
    return { ...demoProfile, role: "guest" };
  }

  let { data, error } = await safeSupabaseQuery(
    "profile",
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    { data: null, error: null },
  );

  if (!data) {
    const { error: ensureError } = await safeSupabaseQuery(
      "ensure_profile",
      supabase.rpc("ensure_profile"),
      { data: null, error: null },
    );
    reportReadError("ensure_profile", ensureError);
    if (!ensureError) {
      const result = await safeSupabaseQuery(
        "profile retry",
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single(),
        { data: null, error: null },
      );
      data = result.data;
      error = result.error;
    }
  }
  reportReadError("profile", error);
  return data
    ? { ...data, locale: data.locale === "en" ? "en" : "ru" }
    : {
        ...demoProfile,
        id: user.id,
        email: user.email ?? demoProfile.email,
        full_name: String(user.user_metadata?.full_name ?? demoProfile.full_name),
      };
});

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  if (!supabase) return people;
  const { data, error } = await safeSupabaseQuery(
    "profiles",
    supabase.from("profiles").select("*").order("full_name"),
    { data: [], error: null },
  );
  reportReadError("profiles", error);
  return ((data ?? []).map((profile) => ({
    ...profile,
    locale: profile.locale === "en" ? "en" : "ru",
  }))) as Profile[];
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  if (!supabase) return projects;
  const { data, error } = await safeSupabaseQuery(
    "projects",
    supabase
      .from("projects")
      .select("*, owner:profiles!owner_id(id, full_name)")
      .order("deadline"),
    { data: [], error: null },
  );
  reportReadError("projects", error);
  return (data as Project[]) ?? [];
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  if (!supabase) return tasks;
  const { data, error } = await safeSupabaseQuery(
    "tasks",
    supabase
      .from("tasks")
      .select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)")
      .order("due_date"),
    { data: [], error: null },
  );
  reportReadError("tasks", error);
  return (data as Task[]) ?? [];
}

export async function getSongs(): Promise<Song[]> {
  const supabase = await createClient();
  if (!supabase) return songs;
  const { data, error } = await safeSupabaseQuery(
    "songs",
    supabase
      .from("songs")
      .select("*, album:albums(id,title,type,status,cover_image_url), song_materials(type, material_backups(status))")
      .order("created_at", { ascending: false }),
    { data: [], error: null },
  );
  reportReadError("songs", error);
  return mapSettled(data ?? [], "songs signed URLs", async (song) => {
    const album = Array.isArray(song.album) ? song.album[0] : song.album;
    const [albumCoverResult, songCoverResult] = await Promise.allSettled([
      album ? getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url) : Promise.resolve(null),
      getStorageDisplayUrl(supabase, "song-covers", song.cover_image_url),
    ]);
    return {
    ...song,
    album: album ? {
      ...album,
      cover_display_url: albumCoverResult.status === "fulfilled" ? albumCoverResult.value : null,
    } : null,
    cover_display_url: songCoverResult.status === "fulfilled" ? songCoverResult.value : null,
    materials_count: song.song_materials?.length ?? 0,
    missing_backups_count: (song.song_materials ?? []).filter(
      (material: { type: string; material_backups?: { status: string }[] }) =>
        criticalMaterialTypes.has(material.type)
        && material.material_backups?.[0]?.status !== "ok",
    ).length,
  };}) as Promise<Song[]>;
}

export async function getSongsList(limit = 50): Promise<Song[]> {
  const supabase = await createClient();
  if (!supabase) return songs.slice(0, limit);
  const { data, error } = await safeSupabaseQuery(
    "songs list",
    supabase
      .from("songs")
      .select("id,title,subtitle,status,bpm,key,tuning,time_signature,duration,arrangement_version,cover_image_url,cover_status,album_id,track_number,album:albums(id,title,type,status,cover_image_url)")
      .order("created_at", { ascending: false })
      .limit(limit),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("songs list", error);
    return [];
  }
  return mapSettled(data ?? [], "songs list preview URLs", async (song) => {
    const album = Array.isArray(song.album) ? song.album[0] : song.album;
    const [songCoverResult, albumCoverResult] = await Promise.allSettled([
      getStoragePreviewUrl(supabase, "song-covers", song.cover_image_url),
      album ? getStoragePreviewUrl(supabase, "album-covers", album.cover_image_url) : Promise.resolve(null),
    ]);
    return {
      ...song,
      cover_display_url: songCoverResult.status === "fulfilled" ? songCoverResult.value : null,
      album: album ? {
        ...album,
        cover_display_url: albumCoverResult.status === "fulfilled" ? albumCoverResult.value : null,
      } : null,
      materials_count: 0,
      missing_backups_count: 0,
    };
  }) as Promise<Song[]>;
}

export async function getSetlistSongOptions(): Promise<Song[]> {
  const supabase = await createClient();
  if (!supabase) return songs;
  const { data, error } = await safeSupabaseQuery(
    "setlist song options",
    supabase
      .from("songs")
      .select("id,title,status,bpm,key,tuning,cover_image_url,album:albums(id,title,type,status,cover_image_url)")
      .order("title"),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("setlist song options", error);
    return [];
  }
  return mapSettled(data ?? [], "setlist song preview URLs", async (song) => {
    const album = Array.isArray(song.album) ? song.album[0] : song.album;
    const [songCoverResult, albumCoverResult] = await Promise.allSettled([
      getStoragePreviewUrl(supabase, "song-covers", song.cover_image_url),
      album ? getStoragePreviewUrl(supabase, "album-covers", album.cover_image_url) : Promise.resolve(null),
    ]);
    return {
      ...song,
      cover_display_url: songCoverResult.status === "fulfilled" ? songCoverResult.value : null,
      album: album ? {
        ...album,
        cover_display_url: albumCoverResult.status === "fulfilled" ? albumCoverResult.value : null,
      } : null,
      materials_count: 0,
      missing_backups_count: 0,
    };
  }) as Promise<Song[]>;
}

export async function getSongRelationOptions(): Promise<Song[]> {
  const supabase = await createClient();
  if (!supabase) return songs;
  const { data, error } = await safeSupabaseQuery(
    "song relation options",
    supabase
      .from("songs")
      .select("id,title,status,album_id,track_number,album:albums(id,title,type,status)")
      .order("title"),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("song relation options", error);
    return [];
  }
  return ((data ?? []).map((song) => {
    const album = Array.isArray(song.album) ? song.album[0] : song.album;
    return {
      ...song,
      album: album ?? null,
      materials_count: 0,
      missing_backups_count: 0,
    };
  })) as Song[];
}

export async function getAlbums(): Promise<Album[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "albums",
    supabase
      .from("albums")
      .select("*, songs(id,title,track_number)")
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    { data: [], error: null },
  );
  reportReadError("albums", error);
  return mapSettled((data as Album[]) ?? [], "albums signed URLs", async (album) => ({
    ...album,
    cover_display_url: await getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url),
    songs_count: album.songs?.length ?? 0,
  }));
}

export async function getAlbumRelationOptions(): Promise<Album[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "album relation options",
    supabase
      .from("albums")
      .select("id,title,type,status,release_date")
      .order("title"),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("album relation options", error);
    return [];
  }
  return (data as Album[]) ?? [];
}

export async function getAlbumsList(limit = 60): Promise<Album[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "albums list",
    supabase
      .from("albums")
      .select("id,title,type,status,release_date,cover_image_url,cover_status,created_at,updated_at,songs(id)")
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("albums list", error);
    return [];
  }
  return mapSettled((data as Album[]) ?? [], "albums list preview URLs", async (album) => ({
    ...album,
    cover_display_url: await getStoragePreviewUrl(supabase, "album-covers", album.cover_image_url),
    songs_count: album.songs?.length ?? 0,
  }));
}

export async function getAlbum(id: string): Promise<Album | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await safeSupabaseQuery(
    "album",
    supabase
      .from("albums")
      .select("*, songs(*)")
      .eq("id", id)
      .order("track_number", { referencedTable: "songs", ascending: true, nullsFirst: false })
      .maybeSingle(),
    { data: null, error: null },
  );
  reportReadError("album", error);
  if (!data) return null;
  const album = data as Album;
  const albumCoverPromise = getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url);
  const songsPromise = mapSettled(album.songs ?? [], "album songs signed URLs", async (song) => ({
    ...song,
    cover_display_url: await getStorageDisplayUrl(supabase, "song-covers", song.cover_image_url),
  }));
  const [albumCoverResult, songsResult] = await Promise.allSettled([albumCoverPromise, songsPromise]);
  return {
    ...album,
    cover_display_url: albumCoverResult.status === "fulfilled" ? albumCoverResult.value : null,
    songs: songsResult.status === "fulfilled" ? songsResult.value : [],
    songs_count: album.songs?.length ?? 0,
  };
}

export async function getEvents(): Promise<Event[]> {
  const supabase = await createClient();
  if (!supabase) return events;
  const { data, error } = await safeSupabaseQuery(
    "events",
    supabase.from("events").select("*").order("starts_at"),
    { data: [], error: null },
  );
  reportReadError("events", error);
  return mapSettled((data as Event[]) ?? [], "events signed URLs", async (event) => ({
    ...event,
    poster_display_url: await getStorageDisplayUrl(supabase, "event-posters", event.poster_image_url),
  }));
}

export async function getEventRelationOptions(): Promise<Event[]> {
  const supabase = await createClient();
  if (!supabase) return events;
  const { data, error } = await safeSupabaseQuery(
    "event relation options",
    supabase
      .from("events")
      .select("id,title,city,venue,starts_at,status")
      .order("starts_at"),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("event relation options", error);
    return [];
  }
  return (data as Event[]) ?? [];
}

export async function getEventsList(limit = 80): Promise<Event[]> {
  const supabase = await createClient();
  if (!supabase) return events.slice(0, limit);
  const { data, error } = await safeSupabaseQuery(
    "events list",
    supabase
      .from("events")
      .select("id,title,city,venue,starts_at,status,poster_image_url")
      .order("starts_at")
      .limit(limit),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("events list", error);
    return [];
  }
  return mapSettled((data as Event[]) ?? [], "events list preview URLs", async (event) => ({
    ...event,
    poster_display_url: await getStoragePreviewUrl(supabase, "event-posters", event.poster_image_url),
  }));
}

export async function getDashboardUpcomingEvents(): Promise<Event[]> {
  const supabase = await createClient();
  if (!supabase) return events;
  const { data, error } = await safeSupabaseQuery(
    "dashboard upcoming events",
    supabase
      .from("events")
      .select("id,title,city,venue,starts_at,status")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(5),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("dashboard upcoming events", error);
    return [];
  }
  return (data as Event[]) ?? [];
}

export async function getDashboardTasks(): Promise<Task[]> {
  const supabase = await createClient();
  if (!supabase) return tasks;
  const { data, error } = await safeSupabaseQuery(
    "dashboard tasks",
    supabase
      .from("tasks")
      .select("id,title,status,priority,due_date,project_id,song_id,event_id,assignee_id,project:projects(id,title),assignee:profiles!assignee_id(id,full_name),event:events(id,title,city,starts_at),song:songs(id,title)")
      .not("status", "in", "(done,cancelled)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("dashboard tasks", error);
    return [];
  }
  return ((data ?? []).map((task) => ({
    ...task,
    project: Array.isArray(task.project) ? task.project[0] : task.project,
    assignee: Array.isArray(task.assignee) ? task.assignee[0] : task.assignee,
    event: Array.isArray(task.event) ? task.event[0] : task.event,
    song: Array.isArray(task.song) ? task.song[0] : task.song,
  })) as Task[]);
}

export async function getEventSetlist(eventId: string): Promise<EventSetlist | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await safeSupabaseQuery(
    "event setlist",
    supabase
      .from("setlists")
      .select("*, items:setlist_items(*, song:songs(id,title,bpm,key,tuning))")
      .eq("event_id", eventId)
      .order("order_index", { referencedTable: "setlist_items" })
      .limit(1)
      .maybeSingle(),
    { data: null, error: null },
  );
  reportReadError("event setlist", error);
  return (data as EventSetlist | null) ?? null;
}

export async function getRehearsals(): Promise<Rehearsal[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "rehearsals",
    supabase.from("rehearsals").select("*").order("starts_at"),
    { data: [], error: null },
  );
  reportReadError("rehearsals", error);
  return (data as Rehearsal[]) ?? [];
}

export async function getPromoMaterials(): Promise<PromoMaterial[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "promo materials",
    supabase
      .from("promo_materials")
      .select("*")
      .order("publish_date"),
    { data: [], error: null },
  );
  reportReadError("promo materials", error);
  return (data as PromoMaterial[]) ?? [];
}

export async function getEpkProfiles(): Promise<EpkProfile[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "epk profiles",
    supabase
      .from("epk_profiles")
      .select("*, media_links:epk_media_links(id)")
      .order("created_at", { ascending: false }),
    { data: [], error: null },
  );
  reportReadError("epk profiles", error);
  return (data as EpkProfile[]) ?? [];
}

export async function getEpkProfile(id: string): Promise<EpkProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await safeSupabaseQuery(
    "epk profile",
    supabase
      .from("epk_profiles")
      .select("*, media_links:epk_media_links(*)")
      .eq("id", id)
      .order("order_index", { referencedTable: "epk_media_links" })
      .maybeSingle(),
    { data: null, error: null },
  );
  reportReadError("epk profile", error);
  return (data as EpkProfile | null) ?? null;
}

export async function getCopyItems(status?: CopyStatus | "all"): Promise<CopyItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase
    .from("copy_items")
    .select("*, event:events(id,title), album:albums(id,title), song:songs(id,title), epk:epk_profiles(id,title,slug)")
    .order("updated_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await safeSupabaseQuery("copy items", query, { data: [], error: null });
  reportReadError("copy items", error);
  return (data as CopyItem[]) ?? [];
}

export async function getCopyItem(id: string): Promise<CopyItem | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await safeSupabaseQuery(
    "copy item",
    supabase
      .from("copy_items")
      .select("*, event:events(id,title), album:albums(id,title), song:songs(id,title), epk:epk_profiles(id,title,slug), versions:copy_item_versions(*, author:profiles!created_by(id,full_name))")
      .eq("id", id)
      .order("created_at", { referencedTable: "copy_item_versions", ascending: false })
      .maybeSingle(),
    { data: null, error: null },
  );
  reportReadError("copy item", error);
  return (data as CopyItem | null) ?? null;
}

export async function getRelatedCopyItems(relation: "event_id" | "album_id" | "song_id" | "epk_id", id: string): Promise<CopyItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "related copy items",
    supabase
      .from("copy_items")
      .select("id,title,category,channel,language,status,body,updated_at,event_id,album_id,song_id,epk_id")
      .eq(relation, id)
      .order("updated_at", { ascending: false })
      .limit(6),
    { data: [], error: null },
  );
  reportReadError("related copy items", error);
  return (data as CopyItem[]) ?? [];
}

export async function getContentCalendarItems(): Promise<ContentCalendarItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "content calendar items",
    supabase
      .from("content_calendar_items")
      .select("*, copy_item:copy_items(id,title,body), event:events(id,title), album:albums(id,title), song:songs(id,title), epk:epk_profiles(id,title,slug)")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    { data: [], error: null },
  );
  reportReadError("content calendar items", error);
  return (data as ContentCalendarItem[]) ?? [];
}

export async function getDashboardContentItems(): Promise<ContentCalendarItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "dashboard content calendar items",
    supabase
      .from("content_calendar_items")
      .select("id,title,channel,content_type,status,scheduled_at,published_at,created_at")
      .in("status", ["idea", "draft", "ready", "scheduled"])
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(5),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("dashboard content calendar items", error);
    return [];
  }
  return (data as ContentCalendarItem[]) ?? [];
}

export async function getDashboardEpkCount(): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { count, error } = await safeSupabaseQuery(
    "dashboard epk count",
    supabase
      .from("epk_profiles")
      .select("id", { count: "exact", head: true }),
    { data: null, error: null, count: 0 },
  );
  if (error) {
    reportReadError("dashboard epk count", error);
    return 0;
  }
  return count ?? 0;
}

export async function getContentCalendarItem(id: string): Promise<ContentCalendarItem | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await safeSupabaseQuery(
    "content calendar item",
    supabase
      .from("content_calendar_items")
      .select("*, copy_item:copy_items(id,title,body), event:events(id,title), album:albums(id,title), song:songs(id,title), epk:epk_profiles(id,title,slug)")
      .eq("id", id)
      .maybeSingle(),
    { data: null, error: null },
  );
  reportReadError("content calendar item", error);
  return (data as ContentCalendarItem | null) ?? null;
}

export async function getRelatedContentCalendarItems(relation: "copy_item_id" | "event_id" | "album_id" | "song_id" | "epk_id", id: string): Promise<ContentCalendarItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "related content calendar items",
    supabase
      .from("content_calendar_items")
      .select("*, copy_item:copy_items(id,title,body), event:events(id,title), album:albums(id,title), song:songs(id,title), epk:epk_profiles(id,title,slug)")
      .eq(relation, id)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(6),
    { data: [], error: null },
  );
  reportReadError("related content calendar items", error);
  return (data as ContentCalendarItem[]) ?? [];
}

const fileRecordSelect = "*";
const documentFileTypes = ["document", "contract", "invoice", "tech_rider", "stage_plot", "light_timing", "video_timing", "lyrics", "guitar_tab", "bass_tab", "orchestral_score", "orchestral_parts", "reaper_project"];
const imageFileTypes = ["image", "press_photo", "logo", "artwork"];
const audioFileTypes = ["audio", "backing_track", "click_track", "stems"];

async function withFileDisplayUrls(supabase: ServerSupabaseClient, records: FileRecord[]): Promise<FileRecord[]> {
  return mapSettled(records, "file display URLs", async (record) => {
    let displayUrl = record.public_url || record.external_url || null;
    if (record.storage_path) {
      displayUrl = await getStorageDisplayUrl(supabase, record.bucket || "file-library", record.storage_path) ?? displayUrl;
    }
    return {
      ...record,
      display_url: displayUrl,
    };
  });
}

export async function getFileRecords(filter: "all" | "documents" | "images" | "audio" | "archived" = "all"): Promise<FileRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase
    .from("files")
    .select(fileRecordSelect)
    .order("updated_at", { ascending: false });
  if (filter === "documents") query = query.in("file_type", documentFileTypes).neq("status", "archived");
  if (filter === "images") query = query.in("file_type", imageFileTypes).neq("status", "archived");
  if (filter === "audio") query = query.in("file_type", audioFileTypes).neq("status", "archived");
  if (filter === "archived") query = query.eq("status", "archived");
  if (filter === "all") query = query.neq("status", "archived");
  const { data, error } = await safeSupabaseQuery("files", query, { data: [], error: null });
  if (error) {
    reportReadError("files", error);
    return [];
  }
  return withFileDisplayUrls(supabase, (data as FileRecord[]) ?? []);
}

export async function getFileRecord(id: string): Promise<FileRecord | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await safeSupabaseQuery(
    "file",
    supabase
      .from("files")
      .select(fileRecordSelect)
      .eq("id", id)
      .maybeSingle(),
    { data: null, error: null },
  );
  if (error) {
    reportReadError("file", error);
    return null;
  }
  if (!data) return null;
  const [file] = await withFileDisplayUrls(supabase, [data as FileRecord]);
  return file;
}

export async function getRelatedFiles(
  relation: "event_id" | "album_id" | "song_id" | "epk_id" | "copy_item_id" | "content_calendar_item_id",
  id: string,
): Promise<FileRecord[]> {
  const supabase = await createClient();
  if (!supabase || !id) return [];
  const { data, error } = await safeSupabaseQuery(
    "related files",
    supabase
      .from("files")
      .select(fileRecordSelect)
      .eq(relation, id)
      .order("updated_at", { ascending: false })
      .limit(5),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("related files", error);
    return [];
  }
  return withFileDisplayUrls(supabase, (data as FileRecord[]) ?? []);
}

export async function getSharedTechRiderFiles(): Promise<FileRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "shared tech rider files",
    supabase
      .from("files")
      .select(fileRecordSelect)
      .eq("file_type", "tech_rider")
      .is("event_id", null)
      .in("status", ["active", "approved"])
      .order("updated_at", { ascending: false }),
    { data: [], error: null },
  );
  if (error) {
    reportReadError("shared tech rider files", error);
    return [];
  }
  return withFileDisplayUrls(supabase, (data as FileRecord[]) ?? []);
}

export async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "contacts",
    supabase.from("contacts").select("*").order("name"),
    { data: [], error: null },
  );
  reportReadError("contacts", error);
  return (data as Contact[]) ?? [];
}

export async function getFinanceRecords(): Promise<FinanceRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "finance records",
    supabase
      .from("finance_records")
      .select("*")
      .order("date", { ascending: false }),
    { data: [], error: null },
  );
  reportReadError("finance records", error);
  return (data as FinanceRecord[]) ?? [];
}

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "task templates",
    supabase
      .from("task_templates")
      .select("*, items:task_template_items(*)")
      .order("title"),
    { data: [], error: null },
  );
  reportReadError("task templates", error);
  return (data as TaskTemplate[]) ?? [];
}

export async function getPackingLists(): Promise<PackingList[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await safeSupabaseQuery(
    "packing lists",
    supabase
      .from("packing_lists")
      .select("*, event:events(id,title), project:projects(id,title), items:packing_list_items(*)")
      .order("created_at", { ascending: false }),
    { data: [], error: null },
  );
  reportReadError("packing lists", error);
  return (data as PackingList[]) ?? [];
}

export async function getPackingList(id: string): Promise<PackingList | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await safeSupabaseQuery(
    "packing list",
    supabase
      .from("packing_lists")
      .select("*, event:events(id,title), project:projects(id,title), items:packing_list_items(*, responsible:profiles!responsible_id(id,full_name))")
      .eq("id", id)
      .order("order_index", { referencedTable: "packing_list_items" })
      .maybeSingle(),
    { data: null, error: null },
  );
  reportReadError("packing list", error);
  return (data as PackingList | null) ?? null;
}

export async function getRedZoneIssues(eventId?: string): Promise<RedZoneIssue[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let eventQuery = supabase.from("events").select("*").order("starts_at");
  if (eventId) eventQuery = eventQuery.eq("id", eventId);

  const [tasksResult, eventsResult, promoResult, materialsResult, backupsResult, setlistsResult, riderFilesResult] =
    await Promise.all([
      safeSupabaseQuery(
        "red zone tasks",
        supabase.from("tasks").select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)"),
        { data: [], error: null },
      ),
      safeSupabaseQuery("red zone events", eventQuery, { data: [], error: null }),
      safeSupabaseQuery("red zone promo", supabase.from("promo_materials").select("*"), { data: [], error: null }),
      safeSupabaseQuery("red zone materials", supabase.from("song_materials").select("*, song:songs(title)"), { data: [], error: null }),
      safeSupabaseQuery("red zone backups", supabase.from("material_backups").select("*"), { data: [], error: null }),
      safeSupabaseQuery("red zone setlists", supabase.from("setlists").select("event_id, setlist_items(count)"), { data: [], error: null }),
      safeSupabaseQuery("red zone rider files", supabase.from("files").select("event_id").eq("file_type", "tech_rider"), { data: [], error: null }),
    ]);

  reportReadError("red zone tasks", tasksResult.error);
  reportReadError("red zone events", eventsResult.error);
  reportReadError("red zone promo", promoResult.error);
  reportReadError("red zone materials", materialsResult.error);
  reportReadError("red zone backups", backupsResult.error);
  reportReadError("red zone setlists", setlistsResult.error);
  reportReadError("red zone rider files", riderFilesResult.error);

  const selectedEvents = (eventsResult.data as Event[]) ?? [];
  const selectedEventIds = new Set(selectedEvents.map((event) => event.id));
  const selectedTasks = ((tasksResult.data as Task[]) ?? []).filter(
    (task) => !eventId || task.event_id === eventId,
  );
  const selectedPromo = ((promoResult.data as PromoMaterial[]) ?? []).filter(
    (item) => !eventId || item.event_id === eventId,
  );

  return buildRedZoneIssues({
    tasks: selectedTasks,
    events: selectedEvents,
    promo: selectedPromo,
    materials: eventId ? [] : ((materialsResult.data as (Material & { song?: { title: string } })[]) ?? []),
    backups: (backupsResult.data as MaterialBackup[]) ?? [],
    setlistEventIds: new Set(
      (setlistsResult.data ?? [])
        .filter((setlist) => (setlist.setlist_items?.[0]?.count ?? 0) > 0)
        .map((setlist) => setlist.event_id as string)
        .filter((id) => !eventId || selectedEventIds.has(id)),
    ),
    riderFileEventIds: new Set(
      (riderFilesResult.data ?? [])
        .map((file) => file.event_id as string | null)
        .filter((id): id is string => {
          if (!id) return false;
          return !eventId || selectedEventIds.has(id);
        }),
    ),
  });
}

export async function getMyWorkspace() {
  const supabase = await createClient();
  if (!supabase) {
    return { tasks, songs, materials: [] as Material[], events, rehearsals: [] as Rehearsal[] };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { tasks: [] as Task[], songs: [] as Song[], materials: [] as Material[], events: [] as Event[], rehearsals: [] as Rehearsal[] };
  }

  const [taskResult, materialResult, accessResult, rehearsalResult] = await Promise.all([
    safeSupabaseQuery(
      "my tasks",
      supabase
        .from("tasks")
        .select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)")
        .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
        .order("due_date"),
      { data: [], error: null },
    ),
    safeSupabaseQuery(
      "my materials",
      supabase
        .from("song_materials")
        .select("*, material_backups(*)")
        .eq("created_by", user.id),
      { data: [], error: null },
    ),
    safeSupabaseQuery(
      "my access",
      supabase
        .from("entity_access")
        .select("entity_type,entity_id")
        .eq("user_id", user.id),
      { data: [], error: null },
    ),
    safeSupabaseQuery("my rehearsals", supabase.from("rehearsals").select("*").order("starts_at"), { data: [], error: null }),
  ]);
  reportReadError("my tasks", taskResult.error);
  reportReadError("my materials", materialResult.error);
  reportReadError("my access", accessResult.error);
  reportReadError("my rehearsals", rehearsalResult.error);

  const myTasks = (taskResult.data as Task[]) ?? [];
  const ownMaterials = (materialResult.data ?? []).map((material) => ({
    ...material,
    backup: material.material_backups?.[0] ?? null,
  })) as Material[];
  const access = accessResult.data ?? [];
  const songIds = new Set([
    ...myTasks.map((task) => task.song_id).filter(Boolean),
    ...ownMaterials.map((material) => material.song_id),
    ...access.filter((item) => item.entity_type === "song").map((item) => item.entity_id),
  ] as string[]);
  const eventIds = new Set([
    ...myTasks.map((task) => task.event_id).filter(Boolean),
    ...access.filter((item) => item.entity_type === "event").map((item) => item.entity_id),
  ] as string[]);
  const rehearsalIds = new Set(
    access.filter((item) => item.entity_type === "rehearsal").map((item) => item.entity_id),
  );

  const [songResult, relatedMaterialsResult, eventResult] = await Promise.all([
    songIds.size
      ? safeSupabaseQuery(
          "my songs",
          supabase.from("songs").select("*, album:albums(id,title,type,status,cover_image_url)").in("id", [...songIds]),
          { data: [], error: null },
        )
      : Promise.resolve({ data: [], error: null }),
    songIds.size
      ? safeSupabaseQuery(
          "my related materials",
          supabase.from("song_materials").select("*, material_backups(*)").in("song_id", [...songIds]),
          { data: [], error: null },
        )
      : Promise.resolve({ data: [], error: null }),
    eventIds.size
      ? safeSupabaseQuery(
          "my events",
          supabase.from("events").select("*").in("id", [...eventIds]).order("starts_at"),
          { data: [], error: null },
        )
      : Promise.resolve({ data: [], error: null }),
  ]);
  reportReadError("my songs", songResult.error);
  reportReadError("my related materials", relatedMaterialsResult.error);
  reportReadError("my events", eventResult.error);

  const relatedMaterials = (relatedMaterialsResult.data ?? []).map((material) => ({
    ...material,
    backup: material.material_backups?.[0] ?? null,
  })) as Material[];
  const materialsById = new Map(
    [...ownMaterials, ...relatedMaterials].map((material) => [material.id, material]),
  );
  const myRehearsals = ((rehearsalResult.data as Rehearsal[]) ?? []).filter(
    (rehearsal) =>
      rehearsalIds.has(rehearsal.id)
      || rehearsal.participants?.includes(user.id),
  );

  const mySongs = await mapSettled((songResult.data as Song[]) ?? [], "my songs signed URLs", async (song) => {
    const album = Array.isArray(song.album) ? song.album[0] : song.album;
    const [albumCoverResult, songCoverResult] = await Promise.allSettled([
      album ? getStorageDisplayUrl(supabase, "album-covers", album.cover_image_url) : Promise.resolve(null),
      getStorageDisplayUrl(supabase, "song-covers", song.cover_image_url),
    ]);
    return {
      ...song,
      album: album ? {
        ...album,
        cover_display_url: albumCoverResult.status === "fulfilled" ? albumCoverResult.value : null,
      } : null,
      cover_display_url: songCoverResult.status === "fulfilled" ? songCoverResult.value : null,
    };
  });
  const myEvents = await mapSettled((eventResult.data as Event[]) ?? [], "my events signed URLs", async (event) => ({
    ...event,
    poster_display_url: await getStorageDisplayUrl(supabase, "event-posters", event.poster_image_url),
  }));

  return {
    tasks: myTasks,
    songs: mySongs,
    materials: [...materialsById.values()],
    events: myEvents,
    rehearsals: myRehearsals,
  };
}
