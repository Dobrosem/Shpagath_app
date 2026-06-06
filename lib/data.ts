import { createClient } from "./supabase/server";
import { demoProfile, events, people, projects, songs, tasks } from "./demo-data";
import type {
  Contact,
  Event,
  FinanceRecord,
  Profile,
  Project,
  PromoMaterial,
  Rehearsal,
  Song,
  Task,
} from "./types";

function reportReadError(entity: string, error: { message: string } | null) {
  if (error) console.error(`Supabase read ${entity} error:`, error);
}

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  if (!supabase) return demoProfile;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    reportReadError("auth user", authError);
    return demoProfile;
  }

  let { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    const { error: ensureError } = await supabase.rpc("ensure_profile");
    reportReadError("ensure_profile", ensureError);
    if (!ensureError) {
      const result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
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
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  if (!supabase) return people;
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  reportReadError("profiles", error);
  return ((data ?? []).map((profile) => ({
    ...profile,
    locale: profile.locale === "en" ? "en" : "ru",
  }))) as Profile[];
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  if (!supabase) return projects;
  const { data, error } = await supabase
    .from("projects")
    .select("*, owner:profiles!owner_id(id, full_name)")
    .order("deadline");
  reportReadError("projects", error);
  return (data as Project[]) ?? [];
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  if (!supabase) return tasks;
  const { data, error } = await supabase
    .from("tasks")
    .select("*, project:projects(id,title), assignee:profiles!assignee_id(id,full_name)")
    .order("due_date");
  reportReadError("tasks", error);
  return (data as Task[]) ?? [];
}

export async function getSongs(): Promise<Song[]> {
  const supabase = await createClient();
  if (!supabase) return songs;
  const { data, error } = await supabase
    .from("songs")
    .select("*, song_materials(count)")
    .order("created_at", { ascending: false });
  reportReadError("songs", error);
  return (data ?? []).map((song) => ({
    ...song,
    materials_count: song.song_materials?.[0]?.count ?? 0,
  })) as Song[];
}

export async function getEvents(): Promise<Event[]> {
  const supabase = await createClient();
  if (!supabase) return events;
  const { data, error } = await supabase.from("events").select("*").order("starts_at");
  reportReadError("events", error);
  return (data as Event[]) ?? [];
}

export async function getRehearsals(): Promise<Rehearsal[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("rehearsals").select("*").order("starts_at");
  reportReadError("rehearsals", error);
  return (data as Rehearsal[]) ?? [];
}

export async function getPromoMaterials(): Promise<PromoMaterial[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("promo_materials")
    .select("*")
    .order("publish_date");
  reportReadError("promo materials", error);
  return (data as PromoMaterial[]) ?? [];
}

export async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("contacts").select("*").order("name");
  reportReadError("contacts", error);
  return (data as Contact[]) ?? [];
}

export async function getFinanceRecords(): Promise<FinanceRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("finance_records")
    .select("*")
    .order("date", { ascending: false });
  reportReadError("finance records", error);
  return (data as FinanceRecord[]) ?? [];
}
