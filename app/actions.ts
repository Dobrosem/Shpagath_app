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
