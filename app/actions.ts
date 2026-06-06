"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedTables = ["projects", "tasks", "songs", "song_materials", "events", "promo_materials"] as const;
type AllowedTable = (typeof allowedTables)[number];

function cleanForm(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key, value]) => !key.startsWith("$") && value !== "")
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
  );
}

export async function createEntity(table: AllowedTable, path: string, formData: FormData) {
  if (!allowedTables.includes(table)) throw new Error("Unsupported entity");
  const supabase = await createClient();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const payload = cleanForm(formData);
  if (table === "tasks") payload.created_by = user.id;
  if (table === "song_materials") payload.created_by = user.id;
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath(path);
}

export async function updateEntity(table: AllowedTable, id: string, path: string, formData: FormData) {
  if (!allowedTables.includes(table)) throw new Error("Unsupported entity");
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.from(table).update(cleanForm(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(path);
}

export async function deleteEntity(table: AllowedTable, id: string, path: string) {
  if (!allowedTables.includes(table)) throw new Error("Unsupported entity");
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(path);
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/dashboard");
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("Неверный email или пароль")}`);
  redirect("/dashboard");
}
