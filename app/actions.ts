"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canDeleteCriticalData, canDeleteOperationalData, canManageFinance, canManageUsers, normalizeRole } from "@/lib/roles";
import type { ActionState, ContentChannel, ContentStatus, ContentType, CopyCategory, CopyChannel, CopyStatus, FileStatus, FileType, Locale, Role } from "@/lib/types";

const allowedTables = [
  "projects",
  "tasks",
  "songs",
  "song_materials",
  "events",
  "rehearsals",
  "promo_materials",
  "contacts",
  "finance_records",
] as const;
type AllowedTable = (typeof allowedTables)[number];
const ACTION_AUTH_TIMEOUT_MS = 3000;
const ACTION_DB_TIMEOUT_MS = 4500;
const ACTION_REVALIDATE_READ_TIMEOUT_MS = 1500;
const ACTION_SETLIST_DB_TIMEOUT_MS = 3000;
const ACTION_SETLIST_BATCH_SIZE = 25;

const numericFields = new Set([
  "bpm",
  "duration",
  "amount",
  "reliability_rating",
]);

function cleanForm(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key, value]) => !key.startsWith("$") && value !== "")
      .map(([key, value]) => {
        const trimmed = typeof value === "string" ? value.trim() : value;
        return [key, numericFields.has(key) ? Number(trimmed) : trimmed];
      }),
  );
}

function readableError(message: string) {
  if (message.includes("row-level security")) {
    return "Недостаточно прав для сохранения. Проверьте роль пользователя и RLS-политики.";
  }
  if (message.includes("foreign key") || message.includes("violates foreign key")) {
    return "Не удалось сохранить связь. Проверьте выбранный проект, пользователя или профиль.";
  }
  if (message.includes("not-null") || message.includes("null value")) {
    return "Не заполнено обязательное поле.";
  }
  if (message.includes("duplicate key")) {
    return "Такая запись уже существует.";
  }
  return message;
}

function withActionTimeout<T>(promise: PromiseLike<T>, timeoutMs = ACTION_AUTH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function reportActionAuthError(error: unknown) {
  if (!error || typeof error !== "object") {
    console.error("Supabase action auth error:", String(error ?? "Unknown error"));
    return;
  }
  const typedError = error as { message?: string; name?: string; status?: number | string };
  console.error("Supabase action auth error:", {
    name: typedError.name ?? null,
    status: typedError.status ?? null,
    message: typedError.message ?? "Unknown error",
  });
}

function reportActionReadError(entity: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(`Supabase action ${entity} error:`, String(error ?? "Unknown error"));
    return;
  }
  const typedError = error as { message?: string; name?: string; status?: number | string; code?: string };
  console.error(`Supabase action ${entity} error:`, {
    code: typedError.code ?? null,
    name: typedError.name ?? null,
    status: typedError.status ?? null,
    message: typedError.message ?? "Unknown error",
  });
}

function reportActionMutationError(
  action: string,
  context: Record<string, string | number | null | undefined>,
  error: unknown,
) {
  if (!error || typeof error !== "object") {
    console.error(`Supabase ${action} error:`, {
      ...context,
      message: String(error ?? "Unknown error"),
    });
    return;
  }
  const typedError = error as {
    code?: string;
    message?: string;
    name?: string;
    status?: number | string;
  };
  console.error(`Supabase ${action} error:`, {
    ...context,
    code: typedError.code ?? null,
    name: typedError.name ?? null,
    status: typedError.status ?? null,
    message: typedError.message ?? "Unknown error",
  });
}

function safeRevalidatePath(path: string, type?: "layout" | "page") {
  try {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  } catch (error) {
    reportActionMutationError("revalidate path", {
      action: "safeRevalidatePath",
      operation: path,
      eventId: null,
      setlistId: null,
    }, error);
  }
}

async function runActionQuery<T extends { error: unknown }>(
  action: string,
  operation: string,
  query: PromiseLike<T>,
  timeoutMs = ACTION_DB_TIMEOUT_MS,
) {
  try {
    const result = await withActionTimeout(query, timeoutMs);
    if (result.error) {
      reportActionMutationError(action, { action, operation }, result.error);
    }
    return result;
  } catch (error) {
    reportActionMutationError(action, { action, operation }, error);
    return { error } as T;
  }
}

async function ensureAuthenticatedProfile() {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: "Supabase не настроен. Добавьте URL и anon key в .env.local.",
      supabase: null,
      user: null,
    };
  }

  let user = null;
  let authError = null;
  try {
    const result = await withActionTimeout(supabase.auth.getUser());
    user = result.data.user;
    authError = result.error;
  } catch (error) {
    authError = error;
  }

  if (authError || !user) {
    reportActionAuthError(authError);
    return { error: "Сессия истекла. Войдите снова.", supabase, user: null };
  }

  let ensureError = null;
  try {
    const result = await withActionTimeout(
      supabase.rpc("ensure_profile"),
      ACTION_DB_TIMEOUT_MS,
    );
    ensureError = result.error;
  } catch (error) {
    ensureError = error;
  }
  if (ensureError) {
    reportActionReadError("ensure profile", ensureError);
    let fallbackError = null;
    try {
      const result = await withActionTimeout(
        supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email ?? "",
            full_name:
              String(user.user_metadata?.full_name ?? "") ||
              user.email?.split("@")[0] ||
              "Участник",
            role: "guest",
            locale: "ru",
          },
          { onConflict: "id", ignoreDuplicates: true },
        ),
        ACTION_DB_TIMEOUT_MS,
      );
      fallbackError = result.error;
    } catch (error) {
      fallbackError = error;
    }
    if (fallbackError) {
      reportActionReadError("profile fallback", fallbackError);
      return {
        error: "Не удалось подготовить профиль пользователя. Примените миграцию 002.",
        supabase,
        user,
      };
    }
  }

  return { error: null, supabase, user };
}

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

async function readCurrentRole(session: { supabase: ServerSupabaseClient | null; user: { id: string } | null }) {
  if (!session.supabase || !session.user) return null;
  const { data, error } = await withActionTimeout(
    session.supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle(),
    ACTION_DB_TIMEOUT_MS,
  ).catch((error) => {
    return { data: null, error };
  });
  if (error) {
    reportActionReadError("read current action role", error);
    return null;
  }
  return normalizeRole(data?.role);
}

async function requireRole(
  session: { supabase: ServerSupabaseClient | null; user: { id: string } | null },
  allowed: (role: Role | null) => boolean,
  locale: Locale,
) {
  const role = await readCurrentRole(session);
  if (allowed(role)) return null;
  console.error("Supabase action role denied:", { role: role ?? "unknown" });
  return localized(locale, "Недостаточно прав для этого действия.", "You do not have permission for this action.");
}

async function revalidateSongPaths(supabase: ServerSupabaseClient, songId: string) {
  safeRevalidatePath("/songs");
  safeRevalidatePath(`/songs/${songId}`);
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");

  const { data, error } = await withActionTimeout(
    supabase
      .from("setlist_items")
      .select("setlist:setlists(event_id)")
      .eq("song_id", songId),
    ACTION_REVALIDATE_READ_TIMEOUT_MS,
  ).catch((error) => {
    reportActionReadError("read related song events", error);
    return { data: [], error };
  });
  if (error) {
    reportActionReadError("read related song events", error);
    return;
  }
  const eventIds = new Set(
    (data ?? []).flatMap((item) => {
      const setlist = item.setlist as { event_id?: string } | { event_id?: string }[] | null;
      if (Array.isArray(setlist)) return setlist.map((value) => value.event_id).filter(Boolean) as string[];
      return setlist?.event_id ? [setlist.event_id] : [];
    }),
  );
  for (const eventId of eventIds) {
    safeRevalidatePath(`/events/${eventId}`);
    safeRevalidatePath(`/events/${eventId}/battle-sheet`);
    safeRevalidatePath(`/events/${eventId}/setlist`);
  }
}

async function revalidateAlbumPaths(supabase: ServerSupabaseClient, albumId: string) {
  safeRevalidatePath("/albums");
  safeRevalidatePath(`/albums/${albumId}`);
  safeRevalidatePath("/songs");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");
}

function localized(locale: Locale, ru: string, en: string) {
  return locale === "en" ? en : ru;
}

function localizedReadableError(locale: Locale, message: string) {
  if (locale === "ru") return readableError(message);
  if (message.includes("row-level security")) return "You do not have permission to save these changes.";
  if (message.includes("foreign key")) return "A related record prevents this change.";
  if (message.includes("not-null") || message.includes("null value")) return "A required field is missing.";
  if (message.includes("duplicate key")) return "This record already exists.";
  return message;
}

async function insertEntity(
  table: AllowedTable,
  path: string,
  formData: FormData,
): Promise<ActionState> {
  if (!allowedTables.includes(table)) {
    return { success: false, error: "Неподдерживаемый тип данных." };
  }

  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  if (table === "finance_records") {
    const accessError = await requireRole(session, canManageFinance, locale);
    if (accessError) return { success: false, error: accessError };
  }
  if (table === "events" || table === "rehearsals") {
    const accessError = await requireRole(session, canDeleteOperationalData, locale);
    if (accessError) return { success: false, error: accessError };
  }

  const payload = cleanForm(formData);
  if (table === "songs" && (formData.has("duration_minutes") || formData.has("duration_seconds"))) {
    const minutes = Number(formData.get("duration_minutes") || 0);
    const seconds = Number(formData.get("duration_seconds") || 0);
    if (!Number.isInteger(minutes) || minutes < 0 || !Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
      return { success: false, error: "Укажите корректную длительность: секунды должны быть от 0 до 59." };
    }
    payload.duration = minutes * 60 + seconds;
    delete payload.duration_minutes;
    delete payload.duration_seconds;
  }
  if (!payload.title && table !== "contacts") {
    return { success: false, error: "Заполните название." };
  }
  if (table === "contacts" && !payload.name) {
    return { success: false, error: "Заполните имя или название контакта." };
  }
  if (table === "tasks" || table === "song_materials") {
    payload.created_by = session.user.id;
  }
  if (table === "projects" && !payload.owner_id) {
    payload.owner_id = session.user.id;
  }

  const { data, error } = await session.supabase
    .from(table)
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error(`Supabase create ${table} error:`, error, payload);
    return { success: false, error: readableError(error.message) };
  }

  safeRevalidatePath(path);
  safeRevalidatePath("/dashboard");
  if (payload.project_id) safeRevalidatePath(`/projects/${payload.project_id}`);
  if (table === "song_materials" && payload.song_id) {
    await revalidateSongPaths(session.supabase, String(payload.song_id));
  }
  return { success: true, error: null, id: data.id };
}

export async function createEntity(
  table: AllowedTable,
  path: string,
  _previousState: ActionState,
  formData: FormData,
) {
  return insertEntity(table, path, formData);
}

export async function createSong(
  _previousState: ActionState,
  formData: FormData,
) {
  return insertEntity("songs", "/songs", formData);
}

export async function createTask(
  _previousState: ActionState,
  formData: FormData,
) {
  return insertEntity("tasks", "/tasks", formData);
}

const albumTypes = new Set(["album", "ep", "single", "live", "demo", "compilation"]);
const albumStatuses = new Set(["draft", "in_progress", "review", "approved", "released", "archived"]);
const albumCoverStatuses = new Set(["draft", "review", "approved", "outdated", "archived"]);
const epkMediaTypes = new Set(["music", "video", "live_video", "interview", "press", "document", "photo_gallery", "other"]);
const copyCategories = new Set(["concert_announcement", "concert_reminder", "release_announcement", "song_description", "epk_bio", "press_release", "festival_pitch", "social_post", "ad_copy", "telegram_post", "vk_post", "email", "other"]);
const copyChannels = new Set(["vk", "telegram", "instagram", "youtube", "press", "email", "website", "ads", "internal", "other"]);
const copyStatuses = new Set(["draft", "review", "approved", "archived"]);
const contentChannels = new Set(["vk", "telegram", "instagram", "youtube", "website", "email", "ads", "press", "internal", "other"]);
const contentTypes = new Set(["post", "story", "reels", "shorts", "video", "announcement", "reminder", "press_release", "ad", "email", "article", "other"]);
const contentStatuses = new Set(["idea", "draft", "ready", "scheduled", "published", "cancelled", "archived"]);
const fileTypes = new Set(["tech_rider", "stage_plot", "light_timing", "video_timing", "press_photo", "logo", "artwork", "lyrics", "guitar_tab", "bass_tab", "orchestral_score", "orchestral_parts", "backing_track", "click_track", "stems", "reaper_project", "contract", "invoice", "document", "image", "audio", "video", "other"]);
const fileStatuses = new Set(["active", "draft", "review", "approved", "archived"]);
const fileUploadMaxBytes = 8 * 1024 * 1024;
const fileUploadMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const externalOnlyFileTypes = new Set(["backing_track", "click_track", "stems", "reaper_project", "audio", "video"]);

function albumPayload(formData: FormData, locale: Locale) {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "album").trim();
  const status = String(formData.get("status") ?? "draft").trim();
  const releaseDate = String(formData.get("release_date") ?? "").trim();
  const coverImageUrl = String(formData.get("cover_image_url") ?? "").trim();
  const coverStatus = String(formData.get("cover_status") ?? "draft").trim();
  if (!title) {
    return { error: localized(locale, "Введите название альбома.", "Enter the album title."), payload: null };
  }
  if (!albumTypes.has(type)) {
    return { error: localized(locale, "Выберите корректный тип релиза.", "Select a valid release type."), payload: null };
  }
  if (!albumStatuses.has(status)) {
    return { error: localized(locale, "Выберите корректный статус альбома.", "Select a valid album status."), payload: null };
  }
  if (!albumCoverStatuses.has(coverStatus)) {
    return { error: localized(locale, "Выберите корректный статус обложки.", "Select a valid cover status."), payload: null };
  }
  if (coverImageUrl) {
    try {
      new URL(coverImageUrl);
    } catch {
      return { error: localized(locale, "Введите корректную ссылку на обложку.", "Enter a valid cover URL."), payload: null };
    }
  }
  if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return { error: localized(locale, "Укажите корректную дату релиза.", "Enter a valid release date."), payload: null };
  }
  return {
    error: null,
    payload: {
      title,
      type,
      status,
      release_date: releaseDate || null,
      description: String(formData.get("description") ?? "").trim() || null,
      cover_image_url: coverImageUrl || null,
      cover_status: coverStatus,
      cover_notes: String(formData.get("cover_notes") ?? "").trim() || null,
    },
  };
}

export async function createAlbum(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const result = albumPayload(formData, locale);
  if (!result.payload) return { success: false, error: result.error };
  const { data, error } = await session.supabase
    .from("albums")
    .insert({ ...result.payload, created_by: session.user.id })
    .select("id")
    .single();
  if (error) {
    console.error("Supabase create album error:", error, result.payload);
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  safeRevalidatePath("/albums");
  safeRevalidatePath("/songs");
  return { success: true, error: null, id: data.id };
}

export async function updateAlbum(
  albumId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const result = albumPayload(formData, locale);
  if (!result.payload) return { success: false, error: result.error };
  const { data, error } = await runActionQuery(
    "updateAlbum",
    "update album",
    session.supabase
      .from("albums")
      .update(result.payload)
      .eq("id", albumId)
      .select("id")
      .maybeSingle(),
  );
  if (error) {
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    return {
      success: false,
      error: localized(locale, "Альбом не найден или нет прав на редактирование.", "Album not found or access denied."),
    };
  }
  await revalidateAlbumPaths(session.supabase, albumId);
  return { success: true, error: null, id: albumId };
}

export async function updateAlbumCover(
  albumId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const coverStatus = String(formData.get("cover_status") ?? "draft").trim();
  if (!albumCoverStatuses.has(coverStatus)) {
    return {
      success: false,
      error: localized(locale, "Выберите корректный статус обложки.", "Select a valid cover status."),
    };
  }

  let coverImageUrl: string | null | undefined;
  let uploadedStoragePath: string | null = null;
  if (formData.get("remove_cover") === "true") {
    coverImageUrl = null;
  } else {
    const file = formData.get("cover_file");
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return { success: false, error: localized(locale, "Выберите файл изображения.", "Select an image file.") };
      }
      if (file.size > 7 * 1024 * 1024) {
        return { success: false, error: localized(locale, "Изображение должно быть меньше 7 МБ.", "The image must be smaller than 7 MB.") };
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
      uploadedStoragePath = `${albumId}/${Date.now()}-${safeName || "cover"}`;
      const uploadResult = await session.supabase.storage
        .from("album-covers")
        .upload(uploadedStoragePath, file, { contentType: file.type, upsert: false });
      if (uploadResult.error) {
        console.error("Supabase upload album cover error:", uploadResult.error);
        return {
          success: false,
          error: localized(
            locale,
            "Не удалось загрузить обложку. Проверьте bucket album-covers и Storage policies.",
            "Could not upload the cover. Check the album-covers bucket and Storage policies.",
          ),
        };
      }
      coverImageUrl = session.supabase.storage.from("album-covers").getPublicUrl(uploadedStoragePath).data.publicUrl;
    } else {
      const manualUrl = String(formData.get("cover_image_url") ?? "").trim();
      if (manualUrl) {
        try {
          new URL(manualUrl);
        } catch {
          return { success: false, error: localized(locale, "Введите корректную ссылку на обложку.", "Enter a valid cover URL.") };
        }
      }
      coverImageUrl = manualUrl || null;
    }
  }

  const payload: Record<string, string | null> = {
    cover_status: coverStatus,
    cover_notes: String(formData.get("cover_notes") ?? "").trim() || null,
  };
  if (coverImageUrl !== undefined) payload.cover_image_url = coverImageUrl;
  const { data, error } = await runActionQuery(
    "updateAlbumCover",
    "update album cover",
    session.supabase
      .from("albums")
      .update(payload)
      .eq("id", albumId)
      .select("id")
      .maybeSingle(),
  );
  if (error || !data) {
    if (uploadedStoragePath) {
      await session.supabase.storage.from("album-covers").remove([uploadedStoragePath]);
    }
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Альбом не найден или нет прав на редактирование.", "Album not found or access denied."),
    };
  }
  await revalidateAlbumPaths(session.supabase, albumId);
  return { success: true, error: null, id: albumId, count: uploadedStoragePath ? 1 : 0 };
}

export async function deleteAlbum(albumId: string, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canDeleteCriticalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data: album, error: readError } = await session.supabase
    .from("albums")
    .select("id,cover_image_url,songs(id)")
    .eq("id", albumId)
    .maybeSingle();
  if (readError || !album) {
    if (readError) console.error("Supabase read album before delete error:", readError);
    return {
      success: false,
      error: readError
        ? localizedReadableError(locale, readError.message)
        : localized(locale, "Альбом не найден.", "Album not found."),
    };
  }
  const songIds = (album.songs ?? []).map((song: { id: string }) => song.id);
  const { data, error } = await session.supabase
    .from("albums")
    .delete()
    .eq("id", albumId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Supabase delete album error:", error);
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Нет прав на удаление альбома.", "You do not have permission to delete this album."),
    };
  }
  safeRevalidatePath("/albums");
  safeRevalidatePath("/songs");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");
  for (const songId of songIds) await revalidateSongPaths(session.supabase, songId);
  const prefix = "/storage/v1/object/public/album-covers/";
  if (album.cover_image_url?.includes(prefix)) {
    const path = decodeURIComponent(album.cover_image_url.split(prefix)[1]?.split("?")[0] ?? "");
    if (path) {
      const removeResult = await session.supabase.storage.from("album-covers").remove([path]);
      if (removeResult.error) console.error("Supabase delete album cover object error:", removeResult.error);
    }
  }
  return { success: true, error: null, id: albumId };
}

async function saveSongAlbum(
  songId: string,
  albumId: string | null,
  trackNumber: number | null,
  locale: Locale,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  if (trackNumber !== null && (!Number.isInteger(trackNumber) || trackNumber < 1)) {
    return { success: false, error: localized(locale, "Номер трека должен быть положительным целым числом.", "Track number must be a positive whole number.") };
  }
  if (albumId) {
    const { data: targetAlbum, error: albumError } = await withActionTimeout(
      session.supabase
        .from("albums")
        .select("id")
        .eq("id", albumId)
        .maybeSingle(),
      ACTION_DB_TIMEOUT_MS,
    ).catch((error) => {
      reportActionReadError("validate song album", error);
      return { data: null, error };
    });
    if (albumError || !targetAlbum) {
      return {
        success: false,
        error: albumError
          ? localizedReadableError(locale, albumError.message)
          : localized(locale, "Альбом не найден.", "Album not found."),
      };
    }
  }
  const { data: currentSong } = await withActionTimeout(
    session.supabase
      .from("songs")
      .select("album_id")
      .eq("id", songId)
      .maybeSingle(),
    ACTION_DB_TIMEOUT_MS,
  ).catch((error) => {
    reportActionReadError("read song before album assignment", error);
    return { data: null, error };
  });
  const { data, error } = await withActionTimeout(
    session.supabase
      .from("songs")
      .update({ album_id: albumId, track_number: albumId ? trackNumber : null })
      .eq("id", songId)
      .select("id")
      .maybeSingle(),
    ACTION_DB_TIMEOUT_MS,
  ).catch((error) => {
    reportActionReadError("update song album assignment", error);
    return { data: null, error };
  });
  if (error || !data) {
    if (error) console.error("Supabase assign song album error:", error);
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Песня не найдена или нет прав на редактирование.", "Song not found or access denied."),
    };
  }
  if (currentSong?.album_id) await revalidateAlbumPaths(session.supabase, currentSong.album_id);
  if (albumId) await revalidateAlbumPaths(session.supabase, albumId);
  await revalidateSongPaths(session.supabase, songId);
  return { success: true, error: null, id: songId };
}

export async function assignSongToAlbum(
  songId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const albumId = String(formData.get("album_id") ?? "").trim();
  const rawTrack = String(formData.get("track_number") ?? "").trim();
  return saveSongAlbum(songId, albumId || null, rawTrack ? Number(rawTrack) : null, locale);
}

export async function removeSongFromAlbum(songId: string, albumId: string, locale: Locale) {
  void albumId;
  return saveSongAlbum(songId, null, null, locale);
}

export async function updateSongTrackNumber(
  songId: string,
  albumId: string,
  trackNumber: number,
  locale: Locale,
) {
  return saveSongAlbum(songId, albumId, trackNumber, locale);
}

export async function updateEntity(
  table: AllowedTable,
  id: string,
  path: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  if (table === "finance_records") {
    const accessError = await requireRole(session, canManageFinance, locale);
    if (accessError) return { success: false, error: accessError };
  }
  if (table === "events" || table === "rehearsals") {
    const accessError = await requireRole(session, canDeleteOperationalData, locale);
    if (accessError) return { success: false, error: accessError };
  }
  const payload = cleanForm(formData);
  const { error } = await session.supabase.from(table).update(payload).eq("id", id);
  if (error) {
    console.error(`Supabase update ${table} error:`, error, payload);
    return { success: false, error: readableError(error.message) };
  }
  safeRevalidatePath(path);
  safeRevalidatePath("/dashboard");
  return { success: true, error: null, id };
}

export async function updateSong(
  songId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const textFields = [
    "title",
    "subtitle",
    "key",
    "tuning",
    "time_signature",
    "lyrics",
    "description",
    "live_version_notes",
    "arrangement_version",
  ] as const;
  const payload: Record<string, string | number | null> = {};

  for (const field of textFields) {
    if (!formData.has(field)) continue;
    const value = String(formData.get(field) ?? "").trim();
    payload[field] = value || null;
  }
  if (formData.has("title") && !payload.title) {
    return {
      success: false,
      error: localized(locale, "Введите название песни.", "Enter the song title."),
    };
  }

  if (formData.has("status")) {
    const status = String(formData.get("status") ?? "");
    const allowed = new Set([
      "idea", "demo", "arrangement", "recording", "mixing",
      "mastering", "ready", "live_ready", "archived",
    ]);
    if (!allowed.has(status)) {
      return {
        success: false,
        error: localized(locale, "Выберите корректный статус песни.", "Select a valid song status."),
      };
    }
    payload.status = status;
  }

  for (const field of ["bpm"] as const) {
    if (!formData.has(field)) continue;
    const rawValue = String(formData.get(field) ?? "").trim();
    if (!rawValue) {
      payload[field] = null;
      continue;
    }
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 0 || (field === "bpm" && (value < 20 || value > 400))) {
      return {
        success: false,
        error: field === "bpm"
          ? localized(locale, "BPM должен быть от 20 до 400.", "BPM must be between 20 and 400.")
          : localized(locale, "Длительность должна быть целым числом секунд.", "Duration must be a whole number of seconds."),
      };
    }
    payload[field] = value;
  }
  if (formData.has("duration_minutes") || formData.has("duration_seconds")) {
    const minutes = Number(formData.get("duration_minutes") || 0);
    const seconds = Number(formData.get("duration_seconds") || 0);
    if (!Number.isInteger(minutes) || minutes < 0 || !Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
      return {
        success: false,
        error: localized(
          locale,
          "Укажите корректную длительность: секунды должны быть от 0 до 59.",
          "Enter a valid duration: seconds must be between 0 and 59.",
        ),
      };
    }
    payload.duration = minutes * 60 + seconds;
  }

  if (!Object.keys(payload).length) {
    return {
      success: false,
      error: localized(locale, "Нет данных для сохранения.", "There is nothing to save."),
    };
  }
  const { data, error } = await runActionQuery(
    "updateSong",
    "update song",
    session.supabase
      .from("songs")
      .update(payload)
      .eq("id", songId)
      .select("id")
      .maybeSingle(),
  );
  if (error) {
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    return {
      success: false,
      error: localized(locale, "Песня не найдена или нет прав на редактирование.", "Song not found or access denied."),
    };
  }
  await revalidateSongPaths(session.supabase, songId);
  return { success: true, error: null, id: songId };
}

export async function updateSongMaterial(
  materialId: string,
  songId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!title || !type || !url) {
    return {
      success: false,
      error: localized(locale, "Заполните название, тип и ссылку материала.", "Enter the material title, type and URL."),
    };
  }
  try {
    new URL(url);
  } catch {
    return {
      success: false,
      error: localized(locale, "Введите корректную ссылку материала.", "Enter a valid material URL."),
    };
  }
  const allowedStatuses = new Set(["draft", "active", "approved", "outdated", "archived"]);
  const allowedTypes = new Set([
    "demo", "lyrics", "reaper_project", "logic_project", "sibelius_project",
    "dorico_project", "musescore_project", "guitar_tabs", "bass_tabs",
    "orchestral_score", "orchestral_parts", "vocal_score", "choir_score", "midi",
    "click_track", "backing_track", "stems", "reference_audio", "reference_video",
    "live_version_audio", "live_version_video", "notes_pdf", "tech_notes",
  ]);
  if (!allowedTypes.has(type)) {
    return {
      success: false,
      error: localized(locale, "Выберите корректный тип материала.", "Select a valid material type."),
    };
  }
  if (!allowedStatuses.has(status)) {
    return {
      success: false,
      error: localized(locale, "Выберите корректный статус материала.", "Select a valid material status."),
    };
  }
  const payload = {
    title,
    type,
    url,
    status,
    version: String(formData.get("version") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
  const { data, error } = await runActionQuery(
    "updateSongMaterial",
    "update song material",
    session.supabase
      .from("song_materials")
      .update(payload)
      .eq("id", materialId)
      .eq("song_id", songId)
      .select("id")
      .maybeSingle(),
  );
  if (error) {
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    return {
      success: false,
      error: localized(locale, "Материал не найден или нет прав на редактирование.", "Material not found or access denied."),
    };
  }
  await revalidateSongPaths(session.supabase, songId);
  return { success: true, error: null, id: materialId };
}

export async function deleteSongMaterial(
  materialId: string,
  songId: string,
  locale: Locale,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canDeleteCriticalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data, error } = await session.supabase
    .from("song_materials")
    .delete()
    .eq("id", materialId)
    .eq("song_id", songId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Supabase delete song material error:", error);
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    return {
      success: false,
      error: localized(locale, "Материал не найден или нет прав на удаление.", "Material not found or access denied."),
    };
  }
  await revalidateSongPaths(session.supabase, songId);
  return { success: true, error: null, id: materialId };
}

export async function updateSongCover(
  songId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const coverStatus = String(formData.get("cover_status") ?? "draft");
  if (!["draft", "review", "approved", "outdated", "archived"].includes(coverStatus)) {
    return {
      success: false,
      error: localized(locale, "Выберите корректный статус обложки.", "Select a valid cover status."),
    };
  }

  let coverImageUrl: string | null | undefined;
  let uploadedStoragePath: string | null = null;
  if (formData.get("remove_cover") === "true") {
    coverImageUrl = null;
  } else {
    const file = formData.get("cover_file");
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return {
          success: false,
          error: localized(locale, "Выберите файл изображения.", "Select an image file."),
        };
      }
      if (file.size > 7 * 1024 * 1024) {
        return {
          success: false,
          error: localized(locale, "Изображение должно быть меньше 7 МБ.", "The image must be smaller than 7 MB."),
        };
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
      const storagePath = `${songId}/${Date.now()}-${safeName || "cover"}`;
      const uploadResult = await session.supabase.storage
        .from("song-covers")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadResult.error) {
        console.error("Supabase upload song cover error:", uploadResult.error);
        return {
          success: false,
          error: localized(
            locale,
            "Не удалось загрузить обложку. Проверьте bucket song-covers и Storage policies.",
            "Could not upload the cover. Check the song-covers bucket and Storage policies.",
          ),
        };
      }
      uploadedStoragePath = storagePath;
      coverImageUrl = session.supabase.storage.from("song-covers").getPublicUrl(storagePath).data.publicUrl;
    } else if (formData.has("cover_image_url")) {
      const manualUrl = String(formData.get("cover_image_url") ?? "").trim();
      if (manualUrl) {
        try {
          new URL(manualUrl);
        } catch {
          return {
            success: false,
            error: localized(locale, "Введите корректную ссылку на обложку.", "Enter a valid cover URL."),
          };
        }
      }
      coverImageUrl = manualUrl || null;
    }
  }

  const payload: Record<string, string | null> = {
    cover_status: coverStatus,
    cover_notes: String(formData.get("cover_notes") ?? "").trim() || null,
  };
  if (coverImageUrl !== undefined) payload.cover_image_url = coverImageUrl;
  const { data, error } = await runActionQuery(
    "updateSongCover",
    "update song cover",
    session.supabase
      .from("songs")
      .update(payload)
      .eq("id", songId)
      .select("id")
      .maybeSingle(),
  );
  if (error) {
    if (uploadedStoragePath) {
      await session.supabase.storage.from("song-covers").remove([uploadedStoragePath]);
    }
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    if (uploadedStoragePath) {
      await session.supabase.storage.from("song-covers").remove([uploadedStoragePath]);
    }
    return {
      success: false,
      error: localized(locale, "Песня не найдена или нет прав на редактирование.", "Song not found or access denied."),
    };
  }
  await revalidateSongPaths(session.supabase, songId);
  return {
    success: true,
    error: null,
    id: songId,
    count: uploadedStoragePath ? 1 : 0,
  };
}

export async function deleteSong(songId: string, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canDeleteCriticalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data: relatedItems, error: relatedError } = await session.supabase
    .from("setlist_items")
    .select("setlist:setlists(event_id)")
    .eq("song_id", songId);
  if (relatedError) console.error("Supabase read delete song events error:", relatedError);
  const { data: songRecord, error: songReadError } = await session.supabase
    .from("songs")
    .select("cover_image_url")
    .eq("id", songId)
    .maybeSingle();
  if (songReadError) console.error("Supabase read delete song cover error:", songReadError);
  const eventIds = new Set(
    (relatedItems ?? []).flatMap((item) => {
      const setlist = item.setlist as { event_id?: string } | { event_id?: string }[] | null;
      if (Array.isArray(setlist)) return setlist.map((value) => value.event_id).filter(Boolean) as string[];
      return setlist?.event_id ? [setlist.event_id] : [];
    }),
  );

  const { data: deletedSong, error } = await session.supabase
    .from("songs")
    .delete()
    .eq("id", songId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Supabase delete song error:", error);
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!deletedSong) {
    return {
      success: false,
      error: localized(locale, "Песня не найдена или нет прав на удаление.", "Song not found or access denied."),
    };
  }
  safeRevalidatePath("/songs");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");
  safeRevalidatePath("/events");
  for (const eventId of eventIds) {
    safeRevalidatePath(`/events/${eventId}`);
    safeRevalidatePath(`/events/${eventId}/battle-sheet`);
    safeRevalidatePath(`/events/${eventId}/setlist`);
  }
  const publicCoverPrefix = "/storage/v1/object/public/song-covers/";
  const coverUrl = songRecord?.cover_image_url;
  if (coverUrl?.includes(publicCoverPrefix)) {
    const storagePath = decodeURIComponent(coverUrl.split(publicCoverPrefix)[1]?.split("?")[0] ?? "");
    if (storagePath) {
      const removeResult = await session.supabase.storage.from("song-covers").remove([storagePath]);
      if (removeResult.error) console.error("Supabase delete song cover object error:", removeResult.error);
    }
  }
  return { success: true, error: null, id: songId };
}

export async function updateEvent(
  eventId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }

  const title = String(formData.get("title") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const posterStatus = String(formData.get("poster_status") ?? "draft").trim();
  const locale = formData.get("locale") === "en" ? "en" : "ru";
  const accessError = await requireRole(session, canDeleteOperationalData, locale);
  if (accessError) return { success: false, error: accessError };
  const allowedStatuses = new Set([
    "planned",
    "announced",
    "in_progress",
    "done",
    "cancelled",
    "archived",
  ]);

  if (!title || !city || !date || !time) {
    return {
      success: false,
      error: locale === "en"
        ? "Enter the event title, city, date and time."
        : "Заполните название, город, дату и время концерта.",
    };
  }
  if (!allowedStatuses.has(status)) {
    return {
      success: false,
      error: locale === "en"
        ? "Select a valid event status."
        : "Выберите корректный статус концерта.",
    };
  }
  if (!["draft", "review", "approved", "outdated", "archived"].includes(posterStatus)) {
    return {
      success: false,
      error: localized(locale, "Выберите корректный статус афиши.", "Select a valid poster status."),
    };
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const timezoneOffset = Number(formData.get("timezone_offset") ?? 0);
  const startsAt = new Date(
    Date.UTC(year, month - 1, day, hour, minute) + timezoneOffset * 60_000,
  );
  if (Number.isNaN(startsAt.getTime())) {
    return {
      success: false,
      error: locale === "en"
        ? "Enter a valid event date and time."
        : "Укажите корректные дату и время концерта.",
    };
  }

  const optionalTextFields = [
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
  const urlFields = [
    "ticket_url",
    "vk_event_url",
    "stage_plot_url",
    "tech_rider_url",
    "light_timing_url",
    "video_timing_url",
    "poster_image_url",
  ] as const;
  for (const field of urlFields) {
    const value = String(formData.get(field) ?? "").trim();
    if (!value) continue;
    try {
      new URL(value);
    } catch {
      return {
        success: false,
        error: locale === "en"
          ? "Check the links: each URL must start with http:// or https://."
          : "Проверьте ссылки: URL должен начинаться с http:// или https://.",
      };
    }
  }
  const payload: Record<string, string | null> = {
    title,
    city,
    starts_at: startsAt.toISOString(),
    status,
    poster_status: posterStatus,
    poster_notes: String(formData.get("poster_notes") ?? "").trim() || null,
  };
  for (const field of optionalTextFields) {
    const value = String(formData.get(field) ?? "").trim();
    payload[field] = value || null;
  }

  let uploadedPosterPath: string | null = null;
  if (formData.get("remove_poster") === "true") {
    payload.poster_image_url = null;
  } else {
    const posterFile = formData.get("poster_file");
    if (posterFile instanceof File && posterFile.size > 0) {
      if (!posterFile.type.startsWith("image/")) {
        return {
          success: false,
          error: localized(locale, "Выберите изображение для афиши.", "Select an image for the poster."),
        };
      }
      if (posterFile.size > 7 * 1024 * 1024) {
        return {
          success: false,
          error: localized(locale, "Афиша должна быть меньше 7 МБ.", "The poster must be smaller than 7 MB."),
        };
      }
      const safeName = posterFile.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
      uploadedPosterPath = `${eventId}/${Date.now()}-${safeName || "poster"}`;
      const uploadResult = await session.supabase.storage
        .from("event-posters")
        .upload(uploadedPosterPath, posterFile, {
          contentType: posterFile.type,
          upsert: false,
        });
      if (uploadResult.error) {
        console.error("Supabase upload event poster error:", uploadResult.error);
        return {
          success: false,
          error: localized(
            locale,
            "Не удалось загрузить афишу. Проверьте bucket event-posters и Storage policies.",
            "Could not upload the poster. Check the event-posters bucket and Storage policies.",
          ),
        };
      }
      payload.poster_image_url = session.supabase.storage
        .from("event-posters")
        .getPublicUrl(uploadedPosterPath).data.publicUrl;
    } else {
      const manualPosterUrl = String(formData.get("poster_image_url") ?? "").trim();
      payload.poster_image_url = manualPosterUrl || null;
    }
  }

  const { data: updatedEvent, error } = await runActionQuery(
    "updateEvent",
    "update event",
    session.supabase
      .from("events")
      .update(payload)
      .eq("id", eventId)
      .select("id")
      .maybeSingle(),
  );
  if (error) {
    if (uploadedPosterPath) {
      await session.supabase.storage.from("event-posters").remove([uploadedPosterPath]);
    }
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!updatedEvent) {
    if (uploadedPosterPath) {
      await session.supabase.storage.from("event-posters").remove([uploadedPosterPath]);
    }
    return {
      success: false,
      error: localized(locale, "Концерт не найден или нет прав на редактирование.", "Event not found or access denied."),
    };
  }

  const setlistNotes = String(formData.get("setlist_notes") ?? "").trim();
  const { data: setlist, error: setlistReadError } = await runActionQuery(
    "updateEvent",
    "read event setlist notes",
    session.supabase
      .from("setlists")
      .select("id")
      .eq("event_id", eventId)
      .limit(1)
      .maybeSingle(),
  );
  if (setlistReadError) {
    // Event data is already saved. Setlist notes are secondary and must not
    // turn a successful event save into a timed-out/failed POST.
  } else if (setlist) {
    const { error: setlistUpdateError } = await runActionQuery(
      "updateEvent",
      "update event setlist notes",
      session.supabase
        .from("setlists")
        .update({ notes: setlistNotes || null })
        .eq("id", setlist.id),
    );
    if (setlistUpdateError) {
      // Keep the successful event write. The short log from runActionQuery is
      // enough for diagnostics.
    }
  } else if (setlistNotes) {
    const { error: setlistInsertError } = await runActionQuery(
      "updateEvent",
      "create event setlist notes",
      session.supabase
        .from("setlists")
        .insert({
          event_id: eventId,
          title: `${title} setlist`,
          notes: setlistNotes,
        }),
    );
    if (setlistInsertError) {
      // Keep the successful event write. The short log from runActionQuery is
      // enough for diagnostics.
    }
  }

  safeRevalidatePath("/events");
  safeRevalidatePath(`/events/${eventId}`);
  safeRevalidatePath(`/events/${eventId}/battle-sheet`);
  safeRevalidatePath(`/events/${eventId}/setlist`);
  safeRevalidatePath("/dashboard");
  return { success: true, error: null, id: eventId };
}

export async function saveEventSetlist(
  eventId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }

  const locale = formData.get("locale") === "en" ? "en" : "ru";
  const accessError = await requireRole(session, canDeleteOperationalData, locale);
  if (accessError) return { success: false, error: accessError };
  const saveError = localized(
    locale,
    "Не удалось сохранить сетлист. Попробуйте ещё раз.",
    "Could not save the setlist. Try again.",
  );
  const runSetlistQuery = async <T extends { error: unknown }>(
    operation: string,
    setlistId: string | null,
    query: PromiseLike<T>,
  ) => {
    try {
      const result = await withActionTimeout(query, ACTION_SETLIST_DB_TIMEOUT_MS);
      if (result.error) {
        reportActionMutationError("save event setlist", {
          action: "saveEventSetlist",
          operation,
          eventId,
          setlistId,
        }, result.error);
      }
      return result;
    } catch (error) {
      reportActionMutationError("save event setlist", {
        action: "saveEventSetlist",
        operation,
        eventId,
        setlistId,
      }, error);
      return { error } as T;
    }
  };
  const runSetlistMutationBatch = async (
    operation: string,
    setlistId: string,
    mutations: Array<() => PromiseLike<{ error: unknown }>>,
  ) => {
    for (let index = 0; index < mutations.length; index += ACTION_SETLIST_BATCH_SIZE) {
      const chunk = mutations.slice(index, index + ACTION_SETLIST_BATCH_SIZE);
      const results = await Promise.all(
        chunk.map((mutation, mutationIndex) =>
          runSetlistQuery(`${operation}:${index + mutationIndex}`, setlistId, mutation()),
        ),
      );
      const failed = results.find((result) => result.error);
      if (failed) return failed.error;
    }
    return null;
  };
  const rawItems = String(formData.get("items") ?? "[]");
  let parsedItems: unknown;
  try {
    parsedItems = JSON.parse(rawItems);
  } catch {
    return {
      success: false,
      error: locale === "en"
        ? "The setlist data is invalid. Reload the page and try again."
        : "Данные сетлиста повреждены. Обновите страницу и попробуйте снова.",
    };
  }

  if (!Array.isArray(parsedItems) || parsedItems.length > 500) {
    return {
      success: false,
      error: locale === "en"
        ? "The setlist data is invalid."
        : "Некорректные данные сетлиста.",
    };
  }

  const items = parsedItems.map((item) => {
    const value = item && typeof item === "object"
      ? item as Record<string, unknown>
      : {};
    return {
      song_id: typeof value.song_id === "string" ? value.song_id.trim() : "",
      live_version: typeof value.live_version === "string"
        ? value.live_version.trim().slice(0, 500)
        : "",
      notes: typeof value.notes === "string" ? value.notes.trim().slice(0, 4000) : "",
    };
  });
  const songIds = items.map((item) => item.song_id);
  if (songIds.some((id) => !id) || new Set(songIds).size !== songIds.length) {
    return {
      success: false,
      error: locale === "en"
        ? "Each song can appear in the setlist only once."
        : "Каждая песня может быть добавлена в сетлист только один раз.",
    };
  }

  const eventResult = await runSetlistQuery(
    "read event",
    null,
    session.supabase
      .from("events")
      .select("id,title")
      .eq("id", eventId)
      .maybeSingle(),
  );
  if (eventResult.error || !eventResult.data) {
    return {
      success: false,
      error: locale === "en" ? "Event not found or access denied." : "Концерт не найден или нет доступа.",
    };
  }

  if (songIds.length) {
    const songsResult = await runSetlistQuery(
      "validate songs",
      null,
      session.supabase
        .from("songs")
        .select("id")
        .in("id", songIds),
    );
    if (songsResult.error || (songsResult.data ?? []).length !== songIds.length) {
      return {
        success: false,
        error: locale === "en"
          ? "One or more selected songs are unavailable."
          : "Одна или несколько выбранных песен недоступны.",
      };
    }
  }

  const setlistResult = await runSetlistQuery(
    "read setlist",
    null,
    session.supabase
      .from("setlists")
      .select("id")
      .eq("event_id", eventId)
      .limit(1)
      .maybeSingle(),
  );
  if (setlistResult.error) {
    return { success: false, error: saveError };
  }

  let setlistId = setlistResult.data?.id;
  if (!setlistId && items.length) {
    const createResult = await runSetlistQuery(
      "create setlist",
      null,
      session.supabase
        .from("setlists")
        .insert({ event_id: eventId, title: `${eventResult.data.title} setlist` })
        .select("id")
        .single(),
    );
    if (createResult.error || !createResult.data) {
      return {
        success: false,
        error: saveError,
      };
    }
    setlistId = createResult.data.id;
  }

  if (setlistId) {
    const existingResult = await runSetlistQuery(
      "read setlist items",
      setlistId,
      session.supabase
        .from("setlist_items")
        .select("id,song_id,order_index")
        .eq("setlist_id", setlistId)
        .order("order_index"),
    );
    if (existingResult.error) {
      return { success: false, error: saveError };
    }

    const desiredIds = new Set(songIds);
    const existingItems = existingResult.data ?? [];
    const existingBySong = new Map(
      existingItems.map((item) => [item.song_id, item]),
    );
    const removedIds = existingItems
      .filter((item) => !desiredIds.has(item.song_id))
      .map((item) => item.id);

    const temporaryStart = Math.max(
      1000,
      ...existingItems.map((item) => item.order_index + 1000),
    );
    if (existingItems.length) {
      const temporaryError = await runSetlistMutationBatch(
        "prepare setlist order",
        setlistId,
        existingItems.map((item, index) => () =>
          session.supabase
            .from("setlist_items")
            .update({ order_index: temporaryStart + index })
            .eq("id", item.id),
        ),
      );
      if (temporaryError) return { success: false, error: saveError };
    }

    const saveItemError = await runSetlistMutationBatch(
      "save setlist row",
      setlistId,
      items.map((item, index) => () => {
        const payload = {
          order_index: index,
          live_version: item.live_version || null,
          notes: item.notes || null,
        };
        const existing = existingBySong.get(item.song_id);
        return existing
          ? session.supabase.from("setlist_items").update(payload).eq("id", existing.id)
          : session.supabase.from("setlist_items").insert({
              ...payload,
              setlist_id: setlistId,
              song_id: item.song_id,
            });
      }),
    );
    if (saveItemError) return { success: false, error: saveError };

    if (removedIds.length) {
      const removeResult = await runSetlistQuery(
        "remove stale setlist rows",
        setlistId,
        session.supabase
          .from("setlist_items")
          .delete()
          .in("id", removedIds),
      );
      if (removeResult.error) return { success: false, error: saveError };
    }
  }

  safeRevalidatePath("/events");
  safeRevalidatePath(`/events/${eventId}`);
  safeRevalidatePath(`/events/${eventId}/battle-sheet`);
  safeRevalidatePath(`/events/${eventId}/setlist`);
  safeRevalidatePath("/dashboard");
  return { success: true, error: null, id: setlistId, count: items.length };
}

export async function deleteEntity(
  table: AllowedTable,
  id: string,
  path: string,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const criticalTables = new Set<AllowedTable>(["songs", "song_materials", "events", "finance_records"]);
  const operationalDeleteTables = new Set<AllowedTable>(["tasks", "rehearsals", "promo_materials"]);
  const locale: Locale = "ru";
  const accessError = criticalTables.has(table)
    ? await requireRole(session, canDeleteCriticalData, locale)
    : operationalDeleteTables.has(table)
      ? await requireRole(session, canDeleteOperationalData, locale)
      : null;
  if (accessError) return { success: false, error: accessError };
  const { error } = await session.supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`Supabase delete ${table} error:`, error);
    return { success: false, error: readableError(error.message) };
  }
  safeRevalidatePath(path);
  safeRevalidatePath("/dashboard");
  return { success: true, error: null };
}

export async function updateLocale(locale: Locale): Promise<ActionState> {
  if (!["ru", "en"].includes(locale)) {
    return { success: false, error: "Unsupported locale." };
  }
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const { error } = await session.supabase
    .from("profiles")
    .update({ locale })
    .eq("id", session.user.id);
  if (error) {
    console.error("Supabase locale update error:", error);
    return { success: false, error: readableError(error.message) };
  }
  safeRevalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateUserRole(
  profileId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const nextRole = normalizeRole(formData.get("role"));
  if (!nextRole) {
    return { success: false, error: localized(locale, "Выберите корректную роль.", "Select a valid role.") };
  }

  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canManageUsers, locale);
  if (accessError) return { success: false, error: accessError };

  const { data: target, error: readError } = await session.supabase
    .from("profiles")
    .select("id,role")
    .eq("id", profileId)
    .maybeSingle();
  if (readError || !target) {
    return {
      success: false,
      error: readError
        ? localizedReadableError(locale, readError.message)
        : localized(locale, "Пользователь не найден.", "User not found."),
    };
  }

  if (target.role === "admin" && nextRole !== "admin") {
    const { count, error: countError } = await session.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) {
      return { success: false, error: localizedReadableError(locale, countError.message) };
    }
    if ((count ?? 0) <= 1) {
      return {
        success: false,
        error: localized(locale, "Нельзя снять роль последнего администратора.", "You cannot demote the last administrator."),
      };
    }
  }

  const { error } = await session.supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", profileId);
  if (error) {
    return { success: false, error: localizedReadableError(locale, error.message) };
  }

  safeRevalidatePath("/settings");
  safeRevalidatePath("/settings/users");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");
  return { success: true, error: null, id: profileId };
}

export async function createPackingList(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const accessError = await requireRole(session, canDeleteOperationalData, locale);
  if (accessError) return { success: false, error: accessError };

  const payload = cleanForm(formData);
  if (!payload.title || !payload.type) {
    return { success: false, error: "Заполните название и тип списка." };
  }
  payload.created_by = session.user.id;

  const { data, error } = await session.supabase
    .from("packing_lists")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("Supabase create packing list error:", error, payload);
    return { success: false, error: readableError(error.message) };
  }

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("locale")
    .eq("id", session.user.id)
    .maybeSingle();
  const defaultItems = profile?.locale === "en"
    ? [
        ["Instruments", "instruments", 10],
        ["Pedalboards and power supplies", "instruments", 20],
        ["Cables and adapters", "cables", 30],
        ["Microphones and stands", "audio", 40],
        ["Laptop, interface and chargers", "electronics", 50],
        ["Click, backing tracks and backup media", "storage_media", 60],
        ["Stage clothing", "clothing", 70],
        ["Merch and payment materials", "merch", 80],
        ["Venue documents and contacts", "documents", 90],
        ["First aid kit and water", "other", 100],
      ]
    : [
        ["Инструменты", "instruments", 10],
        ["Педалборды и блоки питания", "instruments", 20],
        ["Кабели и переходники", "cables", 30],
        ["Микрофоны и стойки", "audio", 40],
        ["Ноутбук, интерфейс и зарядные устройства", "electronics", 50],
        ["Клик, плейбеки и резервные носители", "storage_media", 60],
        ["Сценическая одежда", "clothing", 70],
        ["Мерч и платёжные материалы", "merch", 80],
        ["Документы и контакты площадки", "documents", 90],
        ["Аптечка и вода", "other", 100],
      ];
  const { error: itemsError } = await session.supabase
    .from("packing_list_items")
    .insert(defaultItems.map(([title, category, orderIndex]) => ({
      packing_list_id: data.id,
      title,
      category,
      order_index: orderIndex,
    })));
  if (itemsError) {
    console.error("Supabase create packing items error:", itemsError);
    return { success: false, error: readableError(itemsError.message), id: data.id };
  }

  safeRevalidatePath("/packing-lists");
  safeRevalidatePath("/dashboard");
  return { success: true, error: null, id: data.id };
}

export async function addPackingListItem(
  packingListId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const accessError = await requireRole(session, canDeleteOperationalData, locale);
  if (accessError) return { success: false, error: accessError };
  const payload = cleanForm(formData);
  if (!payload.title) return { success: false, error: "Заполните название." };
  payload.packing_list_id = packingListId;
  const { data, error } = await session.supabase
    .from("packing_list_items")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { success: false, error: readableError(error.message) };
  safeRevalidatePath(`/packing-lists/${packingListId}`);
  safeRevalidatePath("/packing-lists");
  return { success: true, error: null, id: data.id };
}

export async function setPackingListItemPacked(
  packingListId: string,
  itemId: string,
  packed: boolean,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canDeleteOperationalData, "ru");
  if (accessError) return { success: false, error: accessError };
  const { error } = await session.supabase
    .from("packing_list_items")
    .update({ packed })
    .eq("id", itemId)
    .eq("packing_list_id", packingListId);
  if (error) return { success: false, error: readableError(error.message) };
  safeRevalidatePath(`/packing-lists/${packingListId}`);
  safeRevalidatePath("/packing-lists");
  return { success: true, error: null };
}

export async function deletePackingListItem(
  packingListId: string,
  itemId: string,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canDeleteOperationalData, "ru");
  if (accessError) return { success: false, error: accessError };
  const { error } = await session.supabase
    .from("packing_list_items")
    .delete()
    .eq("id", itemId)
    .eq("packing_list_id", packingListId);
  if (error) return { success: false, error: readableError(error.message) };
  safeRevalidatePath(`/packing-lists/${packingListId}`);
  safeRevalidatePath("/packing-lists");
  return { success: true, error: null };
}

export async function updateMaterialBackup(
  materialId: string,
  songId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const payload = cleanForm(formData);
  const status = String(payload.status || "unchecked");
  if (!["missing_backup", "unchecked", "ok", "problem"].includes(status)) {
    return {
      success: false,
      error: localized(locale, "Выберите корректный статус резервной копии.", "Select a valid backup status."),
    };
  }
  const backupUrl = String(payload.backup_url ?? "");
  if (backupUrl) {
    try {
      new URL(backupUrl);
    } catch {
      return {
        success: false,
        error: localized(locale, "Введите корректную ссылку на копию.", "Enter a valid backup URL."),
      };
    }
  }
  let lastCheckedAt: string | null = null;
  if (payload.last_checked_at) {
    const parsed = new Date(String(payload.last_checked_at));
    if (Number.isNaN(parsed.getTime())) {
      return {
        success: false,
        error: localized(locale, "Укажите корректную дату последней проверки.", "Enter a valid last checked date."),
      };
    }
    lastCheckedAt = parsed.toISOString();
  }
  const record = {
    material_id: materialId,
    backup_url: backupUrl || null,
    backup_location: payload.backup_location || null,
    has_local_copy: formData.get("has_local_copy") === "on",
    has_cloud_copy: formData.get("has_cloud_copy") === "on",
    usb_copy_confirmed: formData.get("usb_copy_confirmed") === "on",
    responsible_id: payload.responsible_id || session.user.id,
    status,
    notes: payload.notes || null,
    verified_at: payload.status === "ok" ? new Date().toISOString() : null,
    last_checked_at: lastCheckedAt,
  };
  const { data, error } = await session.supabase
    .from("material_backups")
    .upsert(record, { onConflict: "material_id" })
    .select("id")
    .single();
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  safeRevalidatePath(`/songs/${songId}`);
  safeRevalidatePath("/songs");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");
  return { success: true, error: null, id: data.id };
}

type TaskRelations = {
  project_id?: string | null;
  song_id?: string | null;
  event_id?: string | null;
};

function revalidateTaskPaths(task: TaskRelations) {
  safeRevalidatePath("/tasks");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");
  if (task.project_id) safeRevalidatePath(`/projects/${task.project_id}`);
  if (task.song_id) safeRevalidatePath(`/songs/${task.song_id}`);
  if (task.event_id) safeRevalidatePath(`/events/${task.event_id}`);
}

export async function updateTask(
  taskId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const priority = String(formData.get("priority") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  if (!title) {
    return { success: false, error: localized(locale, "Введите название задачи.", "Enter the task title.") };
  }
  if (!["todo", "in_progress", "review", "done", "cancelled"].includes(status)) {
    return { success: false, error: localized(locale, "Выберите корректный статус.", "Select a valid status.") };
  }
  if (!["low", "normal", "high", "critical"].includes(priority)) {
    return { success: false, error: localized(locale, "Выберите корректный приоритет.", "Select a valid priority.") };
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { success: false, error: localized(locale, "Укажите корректный срок.", "Enter a valid due date.") };
  }

  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    status,
    priority,
    due_date: dueDate || null,
    assignee_id: String(formData.get("assignee_id") ?? "").trim() || null,
  };
  const { data, error } = await session.supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .select("id,project_id,song_id,event_id")
    .maybeSingle();
  if (error) {
    console.error("Supabase update task error:", error, payload);
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    return {
      success: false,
      error: localized(locale, "Задача не найдена или нет прав на редактирование.", "Task not found or access denied."),
    };
  }
  revalidateTaskPaths(data);
  return { success: true, error: null, id: taskId };
}

export async function toggleTaskDone(
  taskId: string,
  currentStatus: string,
  locale: Locale,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const nextStatus = currentStatus === "done" ? "todo" : "done";
  const { data, error } = await session.supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", taskId)
    .select("id,project_id,song_id,event_id")
    .maybeSingle();
  if (error) {
    console.error("Supabase toggle task error:", error);
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    return {
      success: false,
      error: localized(locale, "Задача не найдена или нет прав на редактирование.", "Task not found or access denied."),
    };
  }
  revalidateTaskPaths(data);
  return { success: true, error: null, id: taskId };
}

export async function deleteTask(taskId: string, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canDeleteOperationalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data, error } = await session.supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("id,project_id,song_id,event_id")
    .maybeSingle();
  if (error) {
    console.error("Supabase delete task error:", error);
    return { success: false, error: localizedReadableError(locale, error.message) };
  }
  if (!data) {
    return {
      success: false,
      error: localized(locale, "Задача не найдена или нет прав на удаление.", "Task not found or access denied."),
    };
  }
  revalidateTaskPaths(data);
  return { success: true, error: null, id: taskId };
}

export async function createTasksFromTemplate(
  eventId: string,
  templateId?: string,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const accessError = await requireRole(session, canDeleteOperationalData, "ru");
  if (accessError) return { success: false, error: accessError };

  const eventResult = await session.supabase
    .from("events")
    .select("id,project_id,starts_at")
    .eq("id", eventId)
    .single();
  if (eventResult.error || !eventResult.data) {
    return { success: false, error: readableError(eventResult.error?.message ?? "Концерт не найден.") };
  }

  let templateQuery = session.supabase
    .from("task_templates")
    .select("id, items:task_template_items(*)")
    .eq("type", "concert");
  if (templateId) templateQuery = templateQuery.eq("id", templateId);
  const templateResult = await templateQuery.limit(1).single();
  if (templateResult.error || !templateResult.data) {
    return { success: false, error: "Шаблон подготовки концерта не найден. Примените миграцию 003." };
  }

  const { data: profiles } = await session.supabase.from("profiles").select("id,role");
  const profileByRole = new Map((profiles ?? []).map((profile) => [profile.role, profile.id]));
  const { data: currentProfile } = await session.supabase
    .from("profiles")
    .select("locale")
    .eq("id", session.user.id)
    .maybeSingle();
  const russianTitles: Record<string, string> = {
    "Confirm venue and event contact": "Подтвердить площадку и контакт концерта",
    "Publish event announcement": "Опубликовать анонс концерта",
    "Confirm technical rider": "Подтвердить технический райдер",
    "Prepare poster and ticket links": "Подготовить афишу и ссылки на билеты",
    "Draft setlist": "Подготовить черновик сетлиста",
    "Confirm transport and load-in": "Подтвердить транспорт и загрузку",
    "Prepare battle sheet": "Подготовить боевой лист",
    "Verify backing tracks and click": "Проверить плейбеки и клик",
    "Complete packing list": "Завершить упаковочный лист",
    "Final team briefing": "Провести финальный брифинг команды",
    "Post-event report": "Подготовить отчёт после концерта",
  };
  const { data: existing } = await session.supabase
    .from("tasks")
    .select("title,due_date")
    .eq("event_id", eventId);
  const existingKeys = new Set((existing ?? []).map((task) => `${task.title}|${task.due_date}`));
  const eventDate = new Date(eventResult.data.starts_at);
  const rows = (templateResult.data.items ?? []).flatMap((item: {
    title: string;
    description?: string | null;
    relative_day: number;
    priority: string;
    default_role?: string | null;
  }) => {
    const dueDate = new Date(eventDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + item.relative_day);
    const date = dueDate.toISOString().slice(0, 10);
    const title = currentProfile?.locale === "en" ? item.title : russianTitles[item.title] ?? item.title;
    if (existingKeys.has(`${title}|${date}`)) return [];
    return [{
      title,
      description: item.description,
      event_id: eventId,
      project_id: eventResult.data.project_id,
      due_date: date,
      priority: item.priority,
      status: "todo",
      assignee_id: item.default_role ? profileByRole.get(item.default_role) ?? null : null,
      created_by: session.user.id,
    }];
  });

  if (!rows.length) return { success: true, error: null, count: 0 };
  const { error } = await session.supabase.from("tasks").insert(rows);
  if (error) return { success: false, error: readableError(error.message) };
  safeRevalidatePath(`/events/${eventId}`);
  safeRevalidatePath("/tasks");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/my");
  return { success: true, error: null, count: rows.length };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function epkProfilePayload(formData: FormData, locale: Locale) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  if (!title) return { error: localized(locale, "Введите название EPK.", "Enter the EPK title."), payload: null };
  if (!slug) return { error: localized(locale, "Введите URL-safe slug.", "Enter a URL-safe slug."), payload: null };
  return {
    error: null,
    payload: {
      title,
      slug,
      is_public: formData.get("is_public") === "on",
      short_bio: String(formData.get("short_bio") ?? "").trim() || null,
      full_bio: String(formData.get("full_bio") ?? "").trim() || null,
      genre: String(formData.get("genre") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      booking_email: String(formData.get("booking_email") ?? "").trim() || null,
      booking_phone: String(formData.get("booking_phone") ?? "").trim() || null,
      website_url: String(formData.get("website_url") ?? "").trim() || null,
      vk_url: String(formData.get("vk_url") ?? "").trim() || null,
      telegram_url: String(formData.get("telegram_url") ?? "").trim() || null,
      youtube_url: String(formData.get("youtube_url") ?? "").trim() || null,
      yandex_music_url: String(formData.get("yandex_music_url") ?? "").trim() || null,
      spotify_url: String(formData.get("spotify_url") ?? "").trim() || null,
      apple_music_url: String(formData.get("apple_music_url") ?? "").trim() || null,
      press_quote: String(formData.get("press_quote") ?? "").trim() || null,
      achievements: String(formData.get("achievements") ?? "").trim() || null,
      tech_rider_url: String(formData.get("tech_rider_url") ?? "").trim() || null,
      stage_plot_url: String(formData.get("stage_plot_url") ?? "").trim() || null,
      logo_url: String(formData.get("logo_url") ?? "").trim() || null,
      hero_image_url: String(formData.get("hero_image_url") ?? "").trim() || null,
    },
  };
}

function epkMediaPayload(formData: FormData, locale: Locale) {
  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const orderIndex = Number(formData.get("order_index") ?? 0);
  if (!epkMediaTypes.has(type)) return { error: localized(locale, "Выберите тип медиа.", "Select the media type."), payload: null };
  if (!title) return { error: localized(locale, "Введите название медиа-ссылки.", "Enter the media link title."), payload: null };
  if (!url) return { error: localized(locale, "Введите ссылку.", "Enter the URL."), payload: null };
  return {
    error: null,
    payload: {
      type,
      title,
      url,
      description: String(formData.get("description") ?? "").trim() || null,
      order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
    },
  };
}

async function revalidateEpkPaths(supabase: ServerSupabaseClient, epkId: string, slug?: string | null) {
  safeRevalidatePath("/epk");
  safeRevalidatePath(`/epk/${epkId}`);
  const publicSlug = slug ?? (await supabase.from("epk_profiles").select("slug").eq("id", epkId).maybeSingle()).data?.slug;
  if (publicSlug) safeRevalidatePath(`/public/epk/${publicSlug}`);
}

export async function createEpkProfile(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = epkProfilePayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data, error } = await session.supabase
    .from("epk_profiles")
    .insert({ ...result.payload, created_by: session.user.id })
    .select("id,slug")
    .single();
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  await revalidateEpkPaths(session.supabase, data.id, data.slug);
  return { success: true, error: null, id: data.id };
}

export async function updateEpkProfile(
  epkId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = epkProfilePayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data: oldProfile } = await session.supabase.from("epk_profiles").select("slug").eq("id", epkId).maybeSingle();
  const { data, error } = await session.supabase
    .from("epk_profiles")
    .update(result.payload)
    .eq("id", epkId)
    .select("id,slug")
    .single();
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  await revalidateEpkPaths(session.supabase, data.id, data.slug);
  if (oldProfile?.slug && oldProfile.slug !== data.slug) safeRevalidatePath(`/public/epk/${oldProfile.slug}`);
  return { success: true, error: null, id: data.id };
}

export async function deleteEpkProfile(
  epkId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const accessError = await requireRole(session, canDeleteCriticalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data: profile } = await session.supabase.from("epk_profiles").select("slug").eq("id", epkId).maybeSingle();
  const { error } = await session.supabase.from("epk_profiles").delete().eq("id", epkId);
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  safeRevalidatePath("/epk");
  if (profile?.slug) safeRevalidatePath(`/public/epk/${profile.slug}`);
  return { success: true, error: null };
}

export async function createEpkMediaLink(
  epkId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = epkMediaPayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data, error } = await session.supabase
    .from("epk_media_links")
    .insert({ ...result.payload, epk_id: epkId })
    .select("id")
    .single();
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  await revalidateEpkPaths(session.supabase, epkId);
  return { success: true, error: null, id: data.id };
}

export async function updateEpkMediaLink(
  epkId: string,
  linkId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = epkMediaPayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { error } = await session.supabase
    .from("epk_media_links")
    .update(result.payload)
    .eq("id", linkId)
    .eq("epk_id", epkId);
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  await revalidateEpkPaths(session.supabase, epkId);
  return { success: true, error: null, id: linkId };
}

export async function updateEpkMediaLinkForm(epkId: string, linkId: string, formData: FormData) {
  await updateEpkMediaLink(epkId, linkId, { success: false, error: null }, formData);
}

export async function deleteEpkMediaLink(
  epkId: string,
  linkId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const { error } = await session.supabase.from("epk_media_links").delete().eq("id", linkId).eq("epk_id", epkId);
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  await revalidateEpkPaths(session.supabase, epkId);
  return { success: true, error: null };
}

export async function deleteEpkMediaLinkForm(epkId: string, linkId: string, formData: FormData) {
  await deleteEpkMediaLink(epkId, linkId, { success: false, error: null }, formData);
}

export async function moveEpkMediaLink(epkId: string, linkId: string, direction: -1 | 1): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const { data: links, error: readError } = await session.supabase
    .from("epk_media_links")
    .select("id,order_index")
    .eq("epk_id", epkId)
    .order("order_index")
    .order("created_at");
  if (readError) return { success: false, error: readableError(readError.message) };
  const index = (links ?? []).findIndex((link) => link.id === linkId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= (links ?? []).length) return { success: true, error: null };
  const currentLink = links![index];
  const targetLink = links![target];
  const [first, second] = await Promise.all([
    session.supabase.from("epk_media_links").update({ order_index: targetLink.order_index }).eq("id", currentLink.id),
    session.supabase.from("epk_media_links").update({ order_index: currentLink.order_index }).eq("id", targetLink.id),
  ]);
  const error = first.error ?? second.error;
  if (error) return { success: false, error: readableError(error.message) };
  await revalidateEpkPaths(session.supabase, epkId);
  return { success: true, error: null };
}

function copyItemPayload(formData: FormData, locale: Locale) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "social_post").trim() as CopyCategory;
  const channelValue = String(formData.get("channel") ?? "").trim() as CopyChannel | "";
  const language = String(formData.get("language") ?? "ru").trim() as Locale;
  const status = String(formData.get("status") ?? "draft").trim() as CopyStatus;
  const body = String(formData.get("body") ?? "").trim();
  if (!title) return { error: localized(locale, "Введите название текста.", "Enter the copy title."), payload: null };
  if (!copyCategories.has(category)) return { error: localized(locale, "Выберите категорию.", "Select the category."), payload: null };
  if (channelValue && !copyChannels.has(channelValue)) return { error: localized(locale, "Выберите канал.", "Select the channel."), payload: null };
  if (!["ru", "en"].includes(language)) return { error: localized(locale, "Выберите язык.", "Select the language."), payload: null };
  if (!copyStatuses.has(status)) return { error: localized(locale, "Выберите статус.", "Select the status."), payload: null };
  if (!body) return { error: localized(locale, "Введите текст.", "Enter the copy body."), payload: null };

  const relation = (field: string) => String(formData.get(field) ?? "").trim() || null;
  return {
    error: null,
    payload: {
      title,
      category,
      channel: channelValue || null,
      language,
      status,
      body,
      notes: String(formData.get("notes") ?? "").trim() || null,
      event_id: relation("event_id"),
      album_id: relation("album_id"),
      song_id: relation("song_id"),
      epk_id: relation("epk_id"),
    },
  };
}

function revalidateCopyPaths(item?: { id?: string | null; event_id?: string | null; album_id?: string | null; song_id?: string | null; epk_id?: string | null }) {
  safeRevalidatePath("/copy");
  if (item?.id) safeRevalidatePath(`/copy/${item.id}`);
  if (item?.event_id) safeRevalidatePath(`/events/${item.event_id}`);
  if (item?.album_id) safeRevalidatePath(`/albums/${item.album_id}`);
  if (item?.song_id) safeRevalidatePath(`/songs/${item.song_id}`);
  if (item?.epk_id) safeRevalidatePath(`/epk/${item.epk_id}`);
}

export async function createCopyItem(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = copyItemPayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data, error } = await session.supabase
    .from("copy_items")
    .insert({ ...result.payload, created_by: session.user.id })
    .select("id,event_id,album_id,song_id,epk_id")
    .single();
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  revalidateCopyPaths(data);
  return { success: true, error: null, id: data.id };
}

export async function updateCopyItem(
  copyItemId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = copyItemPayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data: current } = await session.supabase
    .from("copy_items")
    .select("body,notes,event_id,album_id,song_id,epk_id")
    .eq("id", copyItemId)
    .maybeSingle();
  if (current?.body && current.body !== result.payload.body) {
    const { error: versionError } = await session.supabase.from("copy_item_versions").insert({
      copy_item_id: copyItemId,
      body: current.body,
      notes: current.notes,
      created_by: session.user.id,
    });
    if (versionError) console.error("Supabase create copy version before update error:", versionError);
  }
  const { data, error } = await session.supabase
    .from("copy_items")
    .update(result.payload)
    .eq("id", copyItemId)
    .select("id,event_id,album_id,song_id,epk_id")
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Текст не найден или нет прав на редактирование.", "Copy item not found or access denied."),
    };
  }
  revalidateCopyPaths(data);
  if (current) revalidateCopyPaths({ id: copyItemId, ...current });
  return { success: true, error: null, id: copyItemId };
}

export async function createCopyItemVersion(
  copyItemId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { success: false, error: localized(locale, "Введите текст.", "Enter the copy body.") };
  const { error } = await session.supabase.from("copy_item_versions").insert({
    copy_item_id: copyItemId,
    body,
    notes: String(formData.get("version_notes") ?? "").trim() || null,
    created_by: session.user.id,
  });
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  revalidateCopyPaths({ id: copyItemId });
  return { success: true, error: null, id: copyItemId };
}

async function setCopyItemStatus(copyItemId: string, status: CopyStatus, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const { data, error } = await session.supabase
    .from("copy_items")
    .update({ status })
    .eq("id", copyItemId)
    .select("id,event_id,album_id,song_id,epk_id")
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Текст не найден или нет прав на редактирование.", "Copy item not found or access denied."),
    };
  }
  revalidateCopyPaths(data);
  return { success: true, error: null, id: copyItemId };
}

export async function approveCopyItem(copyItemId: string, locale: Locale): Promise<ActionState> {
  return setCopyItemStatus(copyItemId, "approved", locale);
}

export async function archiveCopyItem(copyItemId: string, locale: Locale): Promise<ActionState> {
  return setCopyItemStatus(copyItemId, "archived", locale);
}

export async function deleteCopyItem(copyItemId: string, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const accessError = await requireRole(session, canDeleteCriticalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data: current } = await session.supabase
    .from("copy_items")
    .select("event_id,album_id,song_id,epk_id")
    .eq("id", copyItemId)
    .maybeSingle();
  const { data: deleted, error } = await session.supabase
    .from("copy_items")
    .delete()
    .eq("id", copyItemId)
    .select("id")
    .maybeSingle();
  if (error || !deleted) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Текст не удалён. Проверьте права доступа и RLS-политику.", "Copy item was not deleted. Check access rights and the RLS policy."),
    };
  }
  revalidateCopyPaths({ id: copyItemId, ...current });
  return { success: true, error: null, id: copyItemId };
}

function contentCalendarPayload(formData: FormData, locale: Locale) {
  const title = String(formData.get("title") ?? "").trim();
  const channel = String(formData.get("channel") ?? "vk").trim() as ContentChannel;
  const contentType = String(formData.get("content_type") ?? "post").trim() as ContentType;
  const status = String(formData.get("status") ?? "draft").trim() as ContentStatus;
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
  const publishedAt = String(formData.get("published_at") ?? "").trim();
  if (!title) return { error: localized(locale, "Введите название публикации.", "Enter the calendar item title."), payload: null };
  if (!contentChannels.has(channel)) return { error: localized(locale, "Выберите канал.", "Select the channel."), payload: null };
  if (!contentTypes.has(contentType)) return { error: localized(locale, "Выберите тип контента.", "Select the content type."), payload: null };
  if (!contentStatuses.has(status)) return { error: localized(locale, "Выберите статус.", "Select the status."), payload: null };

  const relation = (field: string) => String(formData.get(field) ?? "").trim() || null;
  return {
    error: null,
    payload: {
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      channel,
      content_type: contentType,
      status,
      scheduled_at: scheduledAt || null,
      published_at: publishedAt || null,
      copy_item_id: relation("copy_item_id"),
      event_id: relation("event_id"),
      album_id: relation("album_id"),
      song_id: relation("song_id"),
      epk_id: relation("epk_id"),
      asset_url: String(formData.get("asset_url") ?? "").trim() || null,
      result_url: String(formData.get("result_url") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  };
}

function revalidateContentCalendarPaths(item?: { id?: string | null; copy_item_id?: string | null; event_id?: string | null; album_id?: string | null; song_id?: string | null; epk_id?: string | null }) {
  safeRevalidatePath("/content-calendar");
  if (item?.id) safeRevalidatePath(`/content-calendar/${item.id}`);
  if (item?.copy_item_id) {
    safeRevalidatePath("/copy");
    safeRevalidatePath(`/copy/${item.copy_item_id}`);
  }
  if (item?.event_id) safeRevalidatePath(`/events/${item.event_id}`);
  if (item?.album_id) safeRevalidatePath(`/albums/${item.album_id}`);
  if (item?.song_id) safeRevalidatePath(`/songs/${item.song_id}`);
  if (item?.epk_id) safeRevalidatePath(`/epk/${item.epk_id}`);
}

export async function createContentCalendarItem(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = contentCalendarPayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data, error } = await session.supabase
    .from("content_calendar_items")
    .insert({ ...result.payload, created_by: session.user.id })
    .select("id,copy_item_id,event_id,album_id,song_id,epk_id")
    .single();
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  revalidateContentCalendarPaths(data);
  return { success: true, error: null, id: data.id };
}

export async function updateContentCalendarItem(
  itemId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = contentCalendarPayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data: current } = await session.supabase
    .from("content_calendar_items")
    .select("copy_item_id,event_id,album_id,song_id,epk_id")
    .eq("id", itemId)
    .maybeSingle();
  const { data, error } = await session.supabase
    .from("content_calendar_items")
    .update(result.payload)
    .eq("id", itemId)
    .select("id,copy_item_id,event_id,album_id,song_id,epk_id")
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Публикация не найдена или нет прав на редактирование.", "Calendar item not found or access denied."),
    };
  }
  revalidateContentCalendarPaths(data);
  if (current) revalidateContentCalendarPaths({ id: itemId, ...current });
  return { success: true, error: null, id: itemId };
}

async function setContentCalendarItemStatus(itemId: string, status: ContentStatus, locale: Locale, publishedAt?: string): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const payload: { status: ContentStatus; published_at?: string | null } = { status };
  if (publishedAt !== undefined) payload.published_at = publishedAt;
  const { data, error } = await session.supabase
    .from("content_calendar_items")
    .update(payload)
    .eq("id", itemId)
    .select("id,copy_item_id,event_id,album_id,song_id,epk_id")
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Публикация не найдена или нет прав на редактирование.", "Calendar item not found or access denied."),
    };
  }
  revalidateContentCalendarPaths(data);
  return { success: true, error: null, id: itemId };
}

export async function markContentCalendarItemPublished(itemId: string, locale: Locale): Promise<ActionState> {
  return setContentCalendarItemStatus(itemId, "published", locale, new Date().toISOString());
}

export async function cancelContentCalendarItem(itemId: string, locale: Locale): Promise<ActionState> {
  return setContentCalendarItemStatus(itemId, "cancelled", locale);
}

export async function archiveContentCalendarItem(itemId: string, locale: Locale): Promise<ActionState> {
  return setContentCalendarItemStatus(itemId, "archived", locale);
}

export async function deleteContentCalendarItem(itemId: string, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const accessError = await requireRole(session, canDeleteCriticalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data: current } = await session.supabase
    .from("content_calendar_items")
    .select("copy_item_id,event_id,album_id,song_id,epk_id")
    .eq("id", itemId)
    .maybeSingle();
  const { data: deleted, error } = await session.supabase
    .from("content_calendar_items")
    .delete()
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
  if (error || !deleted) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Публикация не удалена. Проверьте права доступа и RLS-политику.", "Calendar item was not deleted. Check access rights and the RLS policy."),
    };
  }
  revalidateContentCalendarPaths({ id: itemId, ...current });
  return { success: true, error: null, id: itemId };
}

type FileRelationPayload = {
  event_id?: string | null;
  album_id?: string | null;
  song_id?: string | null;
  epk_id?: string | null;
  copy_item_id?: string | null;
  content_calendar_item_id?: string | null;
};

function relationValue(formData: FormData, key: keyof FileRelationPayload) {
  return String(formData.get(key) ?? "").trim() || null;
}

function validateExternalUrl(value: string, locale: Locale) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return null;
  } catch {
    // handled below
  }
  return localized(locale, "Укажите корректную внешнюю ссылку.", "Enter a valid external URL.");
}

function safeStorageFileName(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "file";
}

function fileStorageFolder(relation: FileRelationPayload) {
  if (relation.event_id) return `event-${relation.event_id}`;
  if (relation.album_id) return `album-${relation.album_id}`;
  if (relation.song_id) return `song-${relation.song_id}`;
  if (relation.epk_id) return `epk-${relation.epk_id}`;
  if (relation.copy_item_id) return `copy-${relation.copy_item_id}`;
  if (relation.content_calendar_item_id) return `content-${relation.content_calendar_item_id}`;
  return "general";
}

function filePayload(formData: FormData, locale: Locale) {
  const title = String(formData.get("title") ?? "").trim();
  const fileType = String(formData.get("file_type") ?? "other").trim() as FileType;
  const status = String(formData.get("status") ?? "active").trim() as FileStatus;
  const externalUrl = String(formData.get("external_url") ?? "").trim();
  if (!title) return { error: localized(locale, "Введите название файла.", "Enter the file title."), payload: null };
  if (!fileTypes.has(fileType)) return { error: localized(locale, "Выберите тип файла.", "Select the file type."), payload: null };
  if (!fileStatuses.has(status)) return { error: localized(locale, "Выберите статус файла.", "Select the file status."), payload: null };
  const urlError = validateExternalUrl(externalUrl, locale);
  if (urlError) return { error: urlError, payload: null };
  const relation = {
    event_id: relationValue(formData, "event_id"),
    album_id: relationValue(formData, "album_id"),
    song_id: relationValue(formData, "song_id"),
    epk_id: relationValue(formData, "epk_id"),
    copy_item_id: relationValue(formData, "copy_item_id"),
    content_calendar_item_id: relationValue(formData, "content_calendar_item_id"),
  };
  return {
    error: null,
    payload: {
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      file_type: fileType,
      status,
      is_public: formData.get("is_public") === "on",
      external_url: externalUrl || null,
      ...relation,
    },
  };
}

function revalidateFilePaths(file?: ({ id?: string | null } & FileRelationPayload) | null) {
  safeRevalidatePath("/files");
  if (file?.id) safeRevalidatePath(`/files/${file.id}`);
  if (file?.event_id) safeRevalidatePath(`/events/${file.event_id}`);
  if (file?.album_id) safeRevalidatePath(`/albums/${file.album_id}`);
  if (file?.song_id) safeRevalidatePath(`/songs/${file.song_id}`);
  if (file?.epk_id) safeRevalidatePath(`/epk/${file.epk_id}`);
  if (file?.copy_item_id) safeRevalidatePath(`/copy/${file.copy_item_id}`);
  if (file?.content_calendar_item_id) safeRevalidatePath(`/content-calendar/${file.content_calendar_item_id}`);
}

function getSelectedFile(formData: FormData) {
  const value = formData.get("file");
  return value instanceof File && value.size > 0 ? value : null;
}

async function uploadLibraryFile(
  supabase: ServerSupabaseClient,
  file: File,
  relation: FileRelationPayload,
  locale: Locale,
  fileType?: FileType,
) {
  if (file.size > fileUploadMaxBytes) {
    return {
      error: localized(locale, "Файл слишком большой. Максимальный размер — 8 МБ. Для тяжёлых файлов используйте внешнюю ссылку.", "The file is too large. Maximum size is 8 MB. Use an external link for heavy files."),
      data: null,
    };
  }
  if (fileType && externalOnlyFileTypes.has(fileType)) {
    return {
      error: localized(locale, "Этот тип файла загружается только внешней ссылкой.", "This file type can only be added as an external link."),
      data: null,
    };
  }
  if (!fileUploadMimeTypes.has(file.type || "")) {
    return {
      error: localized(
        locale,
        "Тяжёлые аудио, видео, stems и проекты лучше хранить на Яндекс Диске и вставлять внешнюю ссылку.",
        "Large audio, video, stems and project files should be stored externally and linked here.",
      ),
      data: null,
    };
  }
  const storagePath = `${fileStorageFolder(relation)}/${Date.now()}-${safeStorageFileName(file.name)}`;
  const { error } = await supabase.storage
    .from("file-library")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    return {
      error: localizedReadableError(locale, error.message),
      data: null,
    };
  }
  return {
    error: null,
    data: {
      bucket: "file-library",
      storage_path: storagePath,
      public_url: null,
      external_url: null,
      mime_type: file.type || null,
      size_bytes: file.size,
    },
  };
}

export async function createFileRecord(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = filePayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const file = getSelectedFile(formData);
  let storagePayload: Record<string, unknown> = {
    bucket: "file-library",
    storage_path: null,
    public_url: null,
    mime_type: null,
    size_bytes: null,
  };
  if (file) {
    const upload = await uploadLibraryFile(session.supabase, file, result.payload, locale, result.payload.file_type);
    if (upload.error || !upload.data) return { success: false, error: upload.error };
    storagePayload = upload.data;
  } else if (!result.payload.external_url) {
    return {
      success: false,
      error: localized(locale, "Загрузите файл или укажите внешнюю ссылку.", "Upload a file or enter an external URL."),
    };
  }

  const { data, error } = await session.supabase
    .from("files")
    .insert({
      ...result.payload,
      ...storagePayload,
      created_by: session.user.id,
    })
    .select("id,event_id,album_id,song_id,epk_id,copy_item_id,content_calendar_item_id")
    .single();
  if (error) return { success: false, error: localizedReadableError(locale, error.message) };
  revalidateFilePaths(data);
  return { success: true, error: null, id: data.id };
}

export async function updateFileRecord(
  fileId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const result = filePayload(formData, locale);
  if (result.error || !result.payload) return { success: false, error: result.error };
  const { data: current } = await session.supabase
    .from("files")
    .select("id,storage_path,event_id,album_id,song_id,epk_id,copy_item_id,content_calendar_item_id")
    .eq("id", fileId)
    .maybeSingle();
  if (!current) {
    return { success: false, error: localized(locale, "Файл не найден или нет прав на редактирование.", "File not found or access denied.") };
  }
  if (!current.storage_path && !result.payload.external_url) {
    return {
      success: false,
      error: localized(locale, "Для файла без загрузки нужна внешняя ссылка.", "A file without uploaded storage needs an external URL."),
    };
  }
  const { data, error } = await session.supabase
    .from("files")
    .update(result.payload)
    .eq("id", fileId)
    .select("id,event_id,album_id,song_id,epk_id,copy_item_id,content_calendar_item_id")
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Файл не найден или нет прав на редактирование.", "File not found or access denied."),
    };
  }
  revalidateFilePaths(data);
  revalidateFilePaths(current);
  return { success: true, error: null, id: fileId };
}

export async function replaceFileInLibrary(
  fileId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const file = getSelectedFile(formData);
  if (!file) return { success: false, error: localized(locale, "Выберите файл для замены.", "Select a replacement file.") };
  const { data: current, error: readError } = await session.supabase
    .from("files")
    .select("id,bucket,storage_path,event_id,album_id,song_id,epk_id,copy_item_id,content_calendar_item_id")
    .eq("id", fileId)
    .maybeSingle();
  if (readError || !current) {
    return {
      success: false,
      error: readError
        ? localizedReadableError(locale, readError.message)
        : localized(locale, "Файл не найден или нет прав на редактирование.", "File not found or access denied."),
    };
  }
  const { data: fileMeta } = await session.supabase
    .from("files")
    .select("file_type")
    .eq("id", fileId)
    .maybeSingle();
  const upload = await uploadLibraryFile(session.supabase, file, current, locale, fileMeta?.file_type as FileType | undefined);
  if (upload.error || !upload.data) return { success: false, error: upload.error };
  const { data, error } = await session.supabase
    .from("files")
    .update(upload.data)
    .eq("id", fileId)
    .select("id,event_id,album_id,song_id,epk_id,copy_item_id,content_calendar_item_id")
    .maybeSingle();
  if (error || !data) return { success: false, error: error ? localizedReadableError(locale, error.message) : localized(locale, "Файл не обновлён.", "File was not updated.") };
  if (current.storage_path) {
    const { error: removeError } = await session.supabase.storage
      .from(current.bucket || "file-library")
      .remove([current.storage_path]);
    if (removeError) console.error("Supabase remove old file object error:", removeError);
  }
  revalidateFilePaths(data);
  return { success: true, error: null, id: fileId };
}

export async function archiveFileRecord(fileId: string, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const { data, error } = await session.supabase
    .from("files")
    .update({ status: "archived" satisfies FileStatus })
    .eq("id", fileId)
    .select("id,event_id,album_id,song_id,epk_id,copy_item_id,content_calendar_item_id")
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Файл не найден или нет прав на редактирование.", "File not found or access denied."),
    };
  }
  revalidateFilePaths(data);
  return { success: true, error: null, id: fileId };
}

export async function deleteFileRecord(fileId: string, locale: Locale): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };
  const accessError = await requireRole(session, canDeleteCriticalData, locale);
  if (accessError) return { success: false, error: accessError };
  const { data: current, error: readError } = await session.supabase
    .from("files")
    .select("id,bucket,storage_path,event_id,album_id,song_id,epk_id,copy_item_id,content_calendar_item_id")
    .eq("id", fileId)
    .maybeSingle();
  if (readError || !current) {
    return {
      success: false,
      error: readError
        ? localizedReadableError(locale, readError.message)
        : localized(locale, "Файл не найден или нет прав на удаление.", "File not found or access denied."),
    };
  }
  if (current.storage_path) {
    const { error: removeError } = await session.supabase.storage
      .from(current.bucket || "file-library")
      .remove([current.storage_path]);
    if (removeError) {
      return { success: false, error: localizedReadableError(locale, removeError.message) };
    }
  }
  const { data: deleted, error } = await session.supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .select("id")
    .maybeSingle();
  if (error || !deleted) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Файл не удалён. Проверьте права доступа и RLS-политику.", "File was not deleted. Check access rights and the RLS policy."),
    };
  }
  revalidateFilePaths(current);
  return { success: true, error: null, id: fileId };
}

export async function assignEventTechRider(
  eventId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ru";
  const fileId = String(formData.get("tech_rider_file_id") ?? "").trim() || null;
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) return { success: false, error: session.error };

  if (fileId) {
    const { data: file, error: fileError } = await session.supabase
      .from("files")
      .select("id,file_type,event_id,status")
      .eq("id", fileId)
      .maybeSingle();
    if (fileError || !file || file.file_type !== "tech_rider" || file.event_id || file.status === "archived") {
      return {
        success: false,
        error: fileError
          ? localizedReadableError(locale, fileError.message)
          : localized(locale, "Выберите доступный общий технический райдер.", "Select an available shared technical rider."),
      };
    }
  }

  const { data, error } = await session.supabase
    .from("events")
    .update({ tech_rider_file_id: fileId })
    .eq("id", eventId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      success: false,
      error: error
        ? localizedReadableError(locale, error.message)
        : localized(locale, "Концерт не найден или нет прав на редактирование.", "Event not found or access denied."),
    };
  }
  safeRevalidatePath(`/events/${eventId}`);
  safeRevalidatePath(`/events/${eventId}/battle-sheet`);
  safeRevalidatePath("/dashboard");
  return { success: true, error: null, id: eventId };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login?error=supabase_not_configured");
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Supabase sign in error:", error);
    redirect("/login?error=invalid_credentials");
  }
  const { error: profileError } = await supabase.rpc("ensure_profile");
  if (profileError) console.error("ensure_profile after sign in error:", profileError);
  redirect("/dashboard");
}
