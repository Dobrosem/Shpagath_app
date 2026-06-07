"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, Locale } from "@/lib/types";

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

async function ensureAuthenticatedProfile() {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: "Supabase не настроен. Добавьте URL и anon key в .env.local.",
      supabase: null,
      user: null,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Supabase auth error:", authError);
    return { error: "Сессия истекла. Войдите снова.", supabase, user: null };
  }

  const { error: ensureError } = await supabase.rpc("ensure_profile");
  if (ensureError) {
    console.error("ensure_profile RPC error:", ensureError);
    const { error: fallbackError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name:
          String(user.user_metadata?.full_name ?? "") ||
          user.email?.split("@")[0] ||
          "Участник",
        role: "member",
        locale: "ru",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (fallbackError) {
      console.error("Profile fallback error:", fallbackError);
      return {
        error: "Не удалось подготовить профиль пользователя. Примените миграцию 002.",
        supabase,
        user,
      };
    }
  }

  return { error: null, supabase, user };
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

  const payload = cleanForm(formData);
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

  revalidatePath(path);
  revalidatePath("/dashboard");
  if (payload.project_id) revalidatePath(`/projects/${payload.project_id}`);
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
  const payload = cleanForm(formData);
  const { error } = await session.supabase.from(table).update(payload).eq("id", id);
  if (error) {
    console.error(`Supabase update ${table} error:`, error, payload);
    return { success: false, error: readableError(error.message) };
  }
  revalidatePath(path);
  revalidatePath("/dashboard");
  return { success: true, error: null, id };
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
  const locale = formData.get("locale") === "en" ? "en" : "ru";
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
  };
  for (const field of optionalTextFields) {
    const value = String(formData.get(field) ?? "").trim();
    payload[field] = value || null;
  }

  const { error } = await session.supabase
    .from("events")
    .update(payload)
    .eq("id", eventId);
  if (error) {
    console.error("Supabase update event error:", error, payload);
    return { success: false, error: readableError(error.message) };
  }

  const setlistNotes = String(formData.get("setlist_notes") ?? "").trim();
  const { data: setlist, error: setlistReadError } = await session.supabase
    .from("setlists")
    .select("id")
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();
  if (setlistReadError) {
    console.error("Supabase read event setlist error:", setlistReadError);
    return { success: false, error: readableError(setlistReadError.message) };
  }
  if (setlist) {
    const { error: setlistUpdateError } = await session.supabase
      .from("setlists")
      .update({ notes: setlistNotes || null })
      .eq("id", setlist.id);
    if (setlistUpdateError) {
      console.error("Supabase update event setlist error:", setlistUpdateError);
      return { success: false, error: readableError(setlistUpdateError.message) };
    }
  } else if (setlistNotes) {
    const { error: setlistInsertError } = await session.supabase
      .from("setlists")
      .insert({
        event_id: eventId,
        title: `${title} setlist`,
        notes: setlistNotes,
      });
    if (setlistInsertError) {
      console.error("Supabase create event setlist error:", setlistInsertError);
      return { success: false, error: readableError(setlistInsertError.message) };
    }
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/battle-sheet`);
  revalidatePath(`/events/${eventId}/setlist`);
  revalidatePath("/dashboard");
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

  const eventResult = await session.supabase
    .from("events")
    .select("id,title")
    .eq("id", eventId)
    .maybeSingle();
  if (eventResult.error || !eventResult.data) {
    console.error("Supabase read setlist event error:", eventResult.error);
    return {
      success: false,
      error: locale === "en" ? "Event not found or access denied." : "Концерт не найден или нет доступа.",
    };
  }

  if (songIds.length) {
    const songsResult = await session.supabase
      .from("songs")
      .select("id")
      .in("id", songIds);
    if (songsResult.error || songsResult.data.length !== songIds.length) {
      console.error("Supabase validate setlist songs error:", songsResult.error);
      return {
        success: false,
        error: locale === "en"
          ? "One or more selected songs are unavailable."
          : "Одна или несколько выбранных песен недоступны.",
      };
    }
  }

  const setlistResult = await session.supabase
    .from("setlists")
    .select("id")
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();
  if (setlistResult.error) {
    console.error("Supabase read setlist error:", setlistResult.error);
    return { success: false, error: readableError(setlistResult.error.message) };
  }

  let setlistId = setlistResult.data?.id;
  if (!setlistId && items.length) {
    const createResult = await session.supabase
      .from("setlists")
      .insert({ event_id: eventId, title: `${eventResult.data.title} setlist` })
      .select("id")
      .single();
    if (createResult.error || !createResult.data) {
      console.error("Supabase create setlist error:", createResult.error);
      return {
        success: false,
        error: locale === "en"
          ? "Could not create the event setlist."
          : "Не удалось создать сетлист концерта.",
      };
    }
    setlistId = createResult.data.id;
  }

  if (setlistId) {
    const existingResult = await session.supabase
      .from("setlist_items")
      .select("id,song_id,order_index")
      .eq("setlist_id", setlistId)
      .order("order_index");
    if (existingResult.error) {
      console.error("Supabase read setlist items error:", existingResult.error);
      return { success: false, error: readableError(existingResult.error.message) };
    }

    const desiredIds = new Set(songIds);
    const existingBySong = new Map(
      (existingResult.data ?? []).map((item) => [item.song_id, item]),
    );
    const removedIds = (existingResult.data ?? [])
      .filter((item) => !desiredIds.has(item.song_id))
      .map((item) => item.id);
    if (removedIds.length) {
      const removeResult = await session.supabase
        .from("setlist_items")
        .delete()
        .in("id", removedIds);
      if (removeResult.error) {
        console.error("Supabase remove setlist items error:", removeResult.error);
        return { success: false, error: readableError(removeResult.error.message) };
      }
    }

    const keptItems = (existingResult.data ?? []).filter((item) => desiredIds.has(item.song_id));
    const temporaryStart = Math.max(
      1000,
      ...keptItems.map((item) => item.order_index + 1000),
    );
    for (const [index, item] of keptItems.entries()) {
      const temporaryResult = await session.supabase
        .from("setlist_items")
        .update({ order_index: temporaryStart + index })
        .eq("id", item.id);
      if (temporaryResult.error) {
        console.error("Supabase prepare setlist order error:", temporaryResult.error);
        return { success: false, error: readableError(temporaryResult.error.message) };
      }
    }

    for (const [index, item] of items.entries()) {
      const payload = {
        order_index: index,
        live_version: item.live_version || null,
        notes: item.notes || null,
      };
      const existing = existingBySong.get(item.song_id);
      const result = existing
        ? await session.supabase.from("setlist_items").update(payload).eq("id", existing.id)
        : await session.supabase.from("setlist_items").insert({
            ...payload,
            setlist_id: setlistId,
            song_id: item.song_id,
          });
      if (result.error) {
        console.error("Supabase save setlist item error:", result.error);
        return {
          success: false,
          error: locale === "en"
            ? "Could not save the setlist. Check your access and try again."
            : "Не удалось сохранить сетлист. Проверьте доступ и попробуйте снова.",
        };
      }
    }
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/battle-sheet`);
  revalidatePath(`/events/${eventId}/setlist`);
  revalidatePath("/dashboard");
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
  const { error } = await session.supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`Supabase delete ${table} error:`, error);
    return { success: false, error: readableError(error.message) };
  }
  revalidatePath(path);
  revalidatePath("/dashboard");
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
  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function createPackingList(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }

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

  revalidatePath("/packing-lists");
  revalidatePath("/dashboard");
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
  const payload = cleanForm(formData);
  if (!payload.title) return { success: false, error: "Заполните название." };
  payload.packing_list_id = packingListId;
  const { data, error } = await session.supabase
    .from("packing_list_items")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { success: false, error: readableError(error.message) };
  revalidatePath(`/packing-lists/${packingListId}`);
  revalidatePath("/packing-lists");
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
  const { error } = await session.supabase
    .from("packing_list_items")
    .update({ packed })
    .eq("id", itemId)
    .eq("packing_list_id", packingListId);
  if (error) return { success: false, error: readableError(error.message) };
  revalidatePath(`/packing-lists/${packingListId}`);
  revalidatePath("/packing-lists");
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
  const { error } = await session.supabase
    .from("packing_list_items")
    .delete()
    .eq("id", itemId)
    .eq("packing_list_id", packingListId);
  if (error) return { success: false, error: readableError(error.message) };
  revalidatePath(`/packing-lists/${packingListId}`);
  revalidatePath("/packing-lists");
  return { success: true, error: null };
}

export async function upsertMaterialBackup(
  materialId: string,
  songId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }
  const payload = cleanForm(formData);
  const record = {
    material_id: materialId,
    backup_url: payload.backup_url || null,
    backup_location: payload.backup_location || null,
    has_local_copy: formData.get("has_local_copy") === "on",
    has_cloud_copy: formData.get("has_cloud_copy") === "on",
    responsible_id: payload.responsible_id || session.user.id,
    status: payload.status || "unchecked",
    notes: payload.notes || null,
    verified_at: payload.status === "ok" ? new Date().toISOString() : null,
  };
  const { data, error } = await session.supabase
    .from("material_backups")
    .upsert(record, { onConflict: "material_id" })
    .select("id")
    .single();
  if (error) return { success: false, error: readableError(error.message) };
  revalidatePath(`/songs/${songId}`);
  revalidatePath("/songs");
  revalidatePath("/dashboard");
  revalidatePath("/my");
  return { success: true, error: null, id: data.id };
}

export async function createTasksFromTemplate(
  eventId: string,
  templateId?: string,
): Promise<ActionState> {
  const session = await ensureAuthenticatedProfile();
  if (session.error || !session.supabase || !session.user) {
    return { success: false, error: session.error };
  }

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
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/my");
  return { success: true, error: null, count: rows.length };
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
